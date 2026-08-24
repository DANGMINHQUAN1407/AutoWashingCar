using Microsoft.EntityFrameworkCore;
using WashingCar_Common.Enum;
using WashingCar_Common.Helpers;
using WashingCar_DAL.Data;
using Microsoft.EntityFrameworkCore.Storage;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Booking;

namespace WashingCar_DAL.Repositories;

public class BookingRepository(WashingCarDbContext db) : IBookingRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task AddAsync(Booking booking, CancellationToken ct = default)
        => await _db.Bookings.AddAsync(booking, ct);

    public async Task<Booking?> GetTrackedByIdAsync(Guid bookingId, CancellationToken ct = default)
        => await _db.Bookings
            .Include(b => b.BookingLines)
            .Include(b => b.SlotInventory)
            .Include(b => b.User)
            .Include(b => b.Vehicle)
            .Include(b => b.AssignedStaff)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct);

    public async Task<Booking?> GetTrackedByQrAsync(string qrToken, CancellationToken ct = default)
        => await _db.Bookings
            .Include(b => b.BookingLines)
            .Include(b => b.SlotInventory)
            .Include(b => b.User)
            .Include(b => b.Vehicle)
            .Include(b => b.AssignedStaff)
            .FirstOrDefaultAsync(b => b.CheckInQrCode == qrToken, ct);

    public async Task<Booking?> GetTrackedByCodeAsync(string bookingCode, CancellationToken ct = default)
        => await _db.Bookings
            .Include(b => b.BookingLines)
            .Include(b => b.SlotInventory)
            .Include(b => b.User)
            .Include(b => b.Vehicle)
            .Include(b => b.AssignedStaff)
            .FirstOrDefaultAsync(b => b.BookingCode == bookingCode, ct);

    public async Task<SlotInventory?> GetSlotForReserveAsync(Guid slotId, CancellationToken ct = default)
        => await _db.SlotInventories.FirstOrDefaultAsync(s => s.SlotInventoryId == slotId, ct);

    public async Task<bool> ExistsCodeAsync(string bookingCode, CancellationToken ct = default)
        => await _db.Bookings.AnyAsync(b => b.BookingCode == bookingCode, ct);

    public async Task<bool> ExistsQrAsync(string qrToken, CancellationToken ct = default)
        => await _db.Bookings.AnyAsync(b => b.CheckInQrCode == qrToken, ct);

    public async Task<List<Booking>> GetRemindableAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct = default)
        => await _db.Bookings
            .Include(b => b.User)
            .Include(b => b.SlotInventory)
            .Include(b => b.Branch)
            .Where(b => b.BookingStatus == BookingStatus.Confirmed
                     && b.ReminderSentAtUtc == null
                     && b.SlotInventory.SlotDate >= fromDate
                     && b.SlotInventory.SlotDate <= toDate)
            .ToListAsync(ct);

    public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default)
        => await _db.Database.BeginTransactionAsync(ct);

    public async Task AcquireUserLockAsync(Guid userId, CancellationToken ct = default)
        => await AcquireTransactionLockAsync($"AutoWashingCar:Booking:User:{userId:N}", ct);

    public async Task AcquireVehicleLockAsync(Guid vehicleId, CancellationToken ct = default)
        => await AcquireTransactionLockAsync($"AutoWashingCar:Booking:Vehicle:{vehicleId:N}", ct);

    public async Task AcquireBookingLockAsync(Guid bookingId, CancellationToken ct = default)
        => await AcquireTransactionLockAsync($"AutoWashingCar:Booking:Booking:{bookingId:N}", ct);

    private async Task AcquireTransactionLockAsync(string resource, CancellationToken ct)
    {
        // Transaction-owned application lock serializes the same logical resource
        // even when requests target different SlotInventory rows.
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            EXEC sp_getapplock
                @Resource = {resource},
                @LockMode = N'Exclusive',
                @LockOwner = N'Transaction',
                @LockTimeout = -1;
            """, ct);
    }

    public async Task<List<Guid>> GetExpiredPendingBookingIdsAsync(
        DateTime expiresBeforeUtc,
        int batchSize,
        CancellationToken ct = default)
        => await _db.Bookings
            .AsNoTracking()
            .Where(b => b.BookingStatus == BookingStatus.Pending
                     && b.CreatedAtUtc <= expiresBeforeUtc)
            .OrderBy(b => b.CreatedAtUtc)
            .ThenBy(b => b.BookingId)
            .Select(b => b.BookingId)
            .Take(batchSize)
            .ToListAsync(ct);

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);

    public async Task<Booking?> GetDetailAsync(Guid bookingId, CancellationToken ct = default)
        => await _db.Bookings.AsNoTracking()
            .Include(b => b.BookingLines)
            .Include(b => b.SlotInventory)
            .Include(b => b.User)
            .Include(b => b.Vehicle)
            .Include(b => b.AssignedStaff)
            .FirstOrDefaultAsync(b => b.BookingId == bookingId, ct);

    public async Task<Booking?> GetDetailByQrAsync(string qrToken, CancellationToken ct = default)
        => await _db.Bookings.AsNoTracking()
            .Include(b => b.BookingLines)
            .Include(b => b.SlotInventory)
            .Include(b => b.User)
            .Include(b => b.Vehicle)
            .Include(b => b.AssignedStaff)
            .FirstOrDefaultAsync(b => b.CheckInQrCode == qrToken, ct);

    public async Task<(List<Booking> Items, int TotalCount)> GetMyBookingsPagedAsync(
        Guid userId, BookingQuery query, CancellationToken ct = default)
    {
        var q = ApplyFilters(
            _db.Bookings.AsNoTracking()
               .Include(b => b.SlotInventory)
               .Include(b => b.Vehicle)
               .Include(b => b.User)
               .Include(b => b.BookingLines)
               .Include(b => b.AssignedStaff)
               .Where(b => b.UserId == userId),
            query);

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(b => b.CreatedAtUtc)
                           .Skip(query.Skip).Take(query.PageSize)
                           .ToListAsync(ct);
        return (items, total);
    }

    public async Task<(List<Booking> Items, int TotalCount)> GetQueuePagedAsync(
        Guid branchId, BookingQuery query, CancellationToken ct = default)
    {
        var q = ApplyFilters(
            _db.Bookings.AsNoTracking()
               .Include(b => b.SlotInventory)
               .Include(b => b.User)
               .Include(b => b.Vehicle)
               .Include(b => b.BookingLines)
               .Include(b => b.AssignedStaff)
               .Where(b => b.BranchId == branchId),
            query);

        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(b => b.SlotInventory.SlotDate)
                           .ThenBy(b => b.SlotInventory.SlotStartTime)
                           .ThenBy(b => b.CreatedAtUtc)
                           .Skip(query.Skip).Take(query.PageSize)
                           .ToListAsync(ct);
        return (items, total);
    }

    /// <summary>Lọc dùng chung cho "đơn của tôi" và "hàng đợi": status / khoảng ngày slot / mã booking.</summary>
    private static IQueryable<Booking> ApplyFilters(IQueryable<Booking> q, BookingQuery query)
    {
        if (query.Status.HasValue)
            q = q.Where(b => b.BookingStatus == query.Status.Value);
        if (query.FromDate.HasValue)
            q = q.Where(b => b.SlotInventory.SlotDate >= query.FromDate.Value);
        if (query.ToDate.HasValue)
            q = q.Where(b => b.SlotInventory.SlotDate <= query.ToDate.Value);
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(b => b.BookingCode.Contains(s));
        }
        return q;
    }

    public async Task<Booking?> GetTrackedByUserVoucherIdAsync(Guid userVoucherId, CancellationToken ct = default)
        => await _db.Bookings
            .FirstOrDefaultAsync(b => b.UserVoucherId == userVoucherId, ct);

    public async Task<int> GetTotalBookingsCountAsync(CancellationToken ct = default)
    {
        return await _db.Bookings.CountAsync(ct);
    }

    public async Task<int> GetBranchBookingsCountAsync(Guid branchId, CancellationToken ct = default)
    {
        return await _db.Bookings.CountAsync(b => b.BranchId == branchId, ct);
    }

    public async Task<int> CountByUserAndStatusesAsync(
        Guid userId,
        IReadOnlyCollection<byte> statuses,
        CancellationToken ct = default)
    {
        return await _db.Bookings
            .AsNoTracking()
            .CountAsync(b => b.UserId == userId && statuses.Contains(b.BookingStatus), ct);
    }

    public async Task<bool> HasVehicleOverlapAsync(
        Guid vehicleId,
        DateOnly slotDate,
        TimeOnly slotStartTime,
        TimeOnly slotEndTime,
        IReadOnlyCollection<byte> blockingStatuses,
        Guid? excludingBookingId = null,
        CancellationToken ct = default)
    {
        return await _db.Bookings
            .AsNoTracking()
            .Where(b => b.VehicleId == vehicleId)
            .Where(b => blockingStatuses.Contains(b.BookingStatus))
            .Where(b => !excludingBookingId.HasValue || b.BookingId != excludingBookingId.Value)
            .AnyAsync(b =>
                b.SlotInventory.SlotDate == slotDate
                && b.SlotInventory.SlotStartTime < slotEndTime
                && slotStartTime < b.SlotInventory.SlotEndTime,
                ct);
    }

    public async Task<List<Booking>> GetForStatsAsync(
        Guid? branchId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct = default)
    {
        // Quy đổi trước thành DateTime cục bộ (không gọi helper bên trong lambda) để EF Core
        // dịch sang SQL an toàn, tránh rủi ro "LINQ expression could not be translated".
        DateTime? fromUtc = fromDate.HasValue
            ? VietnamTimeHelper.SlotStartToUtc(fromDate.Value, TimeOnly.MinValue)
            : null;
        DateTime? toUtc = toDate.HasValue
            ? VietnamTimeHelper.SlotStartToUtc(toDate.Value.AddDays(1), TimeOnly.MinValue)
            : null;

        var q = _db.Bookings.AsNoTracking().AsQueryable();
        if (branchId.HasValue) q = q.Where(b => b.BranchId == branchId.Value);
        if (fromUtc.HasValue) q = q.Where(b => b.CreatedAtUtc >= fromUtc.Value);
        if (toUtc.HasValue) q = q.Where(b => b.CreatedAtUtc < toUtc.Value);

        return await q.Select(b => new Booking
        {
            BookingType = b.BookingType,
            BookingFinalAmount = b.BookingFinalAmount,
            CreatedAtUtc = b.CreatedAtUtc,
        }).ToListAsync(ct);
    }
}
