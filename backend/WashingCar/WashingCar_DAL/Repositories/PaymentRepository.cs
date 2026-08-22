using Microsoft.EntityFrameworkCore;
using WashingCar_Common.Enum;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Payment;

namespace WashingCar_DAL.Repositories;

public class PaymentRepository(WashingCarDbContext db) : IPaymentRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task AddAsync(Payment payment, CancellationToken ct = default)
        => await _db.Payments.AddAsync(payment, ct);

    public async Task<Payment?> GetTrackedByIdAsync(Guid paymentId, CancellationToken ct = default)
        => await _db.Payments
            .Include(p => p.TenderAllocations)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId, ct);

    public async Task<Payment?> GetTrackedByTransactionCodeAsync(string transactionCode, CancellationToken ct = default)
        => await _db.Payments
            .Include(p => p.TenderAllocations)
            .FirstOrDefaultAsync(p => p.TransactionCode == transactionCode, ct);

    public async Task<Payment?> GetDetailAsync(Guid paymentId, CancellationToken ct = default)
        => await _db.Payments.AsNoTracking()
            .Include(p => p.TenderAllocations)
            .Include(p => p.Booking)
            .FirstOrDefaultAsync(p => p.PaymentId == paymentId, ct);

    public async Task<bool> ExistsTransactionCodeAsync(string transactionCode, CancellationToken ct = default)
        => await _db.Payments.AnyAsync(p => p.TransactionCode == transactionCode, ct);

    public async Task<bool> HasPendingOrCompletedPaymentAsync(Guid bookingId, CancellationToken ct = default)
        => await _db.Payments.AnyAsync(p => p.BookingId == bookingId
                                         && (p.PaymentStatus == PaymentStatus.Pending
                                          || p.PaymentStatus == PaymentStatus.Completed), ct);

    public async Task ReloadAsync(Payment payment, CancellationToken ct = default)
        => await _db.Entry(payment).ReloadAsync(ct);

    public async Task<decimal> GetCompletedAmountAsync(Guid bookingId, CancellationToken ct = default)
        => await _db.Payments
            .Where(p => p.BookingId == bookingId
                     && p.PaymentStatus == PaymentStatus.Completed
                     && p.PaymentType   != PaymentType.Refund)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

    public async Task<List<Payment>> GetCompletedPaymentsForRefundAsync(
        Guid bookingId, CancellationToken ct = default)
        => await _db.Payments
            .AsNoTracking()
            .Where(p => p.BookingId == bookingId
                     && p.PaymentStatus == PaymentStatus.Completed
                     && p.PaymentType != PaymentType.Refund
                     && p.Amount > 0)
            .OrderBy(p => p.CreatedAtUtc)
            .ThenBy(p => p.PaymentId)
            .ToListAsync(ct);

    public async Task<List<Payment>> GetTrackedPendingPaymentsAsync(
        Guid bookingId, CancellationToken ct = default)
        => await _db.Payments
            .Where(p => p.BookingId == bookingId
                     && p.PaymentStatus == PaymentStatus.Pending)
            .ToListAsync(ct);

    public async Task<decimal> GetRefundedAmountAsync(
        Guid originalPaymentId, CancellationToken ct = default)
        => await _db.Payments
            .Where(p => p.OriginalPaymentId == originalPaymentId
                     && p.PaymentType == PaymentType.Refund
                     && p.PaymentStatus == PaymentStatus.Completed)
            .SumAsync(p => (decimal?)p.Amount, ct) ?? 0m;

    public async Task<bool> HasCompletedFullPaymentAsync(Guid bookingId, CancellationToken ct = default)
        => await _db.Payments.AnyAsync(p => p.BookingId == bookingId
                                          && p.PaymentStatus == PaymentStatus.Completed
                                          && p.PaymentType   == PaymentType.FullPayment
                                          && p.PaidAtUtc != null
                                          && (p.Booking.CompletedAtUtc == null || p.PaidAtUtc < p.Booking.CompletedAtUtc), ct);

    public async Task<(List<Payment> Items, int TotalCount)> GetPagedAsync(
        PaymentQuery query, Guid? ownerUserId, CancellationToken ct = default)
    {
        var q = _db.Payments.AsNoTracking()
            .Include(p => p.Booking)
            .Include(p => p.TenderAllocations)
            .AsQueryable();

        if (ownerUserId.HasValue)
            q = q.Where(p => p.Booking.UserId == ownerUserId.Value);
        if (query.BookingId.HasValue)
            q = q.Where(p => p.BookingId == query.BookingId.Value);
        if (query.Status.HasValue)
            q = q.Where(p => p.PaymentStatus == query.Status.Value);
        if (query.Type.HasValue)
            q = q.Where(p => p.PaymentType == query.Type.Value);
        if (query.Method.HasValue)
            q = q.Where(p => p.PaymentMethod == query.Method.Value);
        if (query.FromDate.HasValue)
        {
            var from = query.FromDate.Value.ToDateTime(TimeOnly.MinValue);
            q = q.Where(p => p.CreatedAtUtc >= from);
        }
        if (query.ToDate.HasValue)
        {
            var toExclusive = query.ToDate.Value.AddDays(1).ToDateTime(TimeOnly.MinValue);
            q = q.Where(p => p.CreatedAtUtc < toExclusive);
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(p => p.CreatedAtUtc)
                           .Skip(query.Skip).Take(query.PageSize)
                           .ToListAsync(ct);
        return (items, total);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
