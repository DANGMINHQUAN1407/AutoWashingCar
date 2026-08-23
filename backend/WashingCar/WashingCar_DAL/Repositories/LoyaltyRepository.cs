using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WashingCar_Common.Enum;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Loyalty;

namespace WashingCar_DAL.Repositories;

public class LoyaltyRepository(WashingCarDbContext db) : ILoyaltyRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<LoyaltyAccount?> GetByUserIdAsync(Guid userId, CancellationToken ct)
        => await _db.LoyaltyAccounts
            .Include(la => la.Tier)
            .FirstOrDefaultAsync(la => la.UserId == userId, ct);

    public async Task AddAccountAsync(LoyaltyAccount account, CancellationToken ct)
    {
        await _db.LoyaltyAccounts.AddAsync(account, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<(List<LoyaltyLedgerEntry> Items, int TotalCount)> GetLedgerAsync(
        Guid loyaltyAccountId, LoyaltyLedgerQuery query, CancellationToken ct)
    {
        var q = _db.LoyaltyLedgerEntries
            .AsNoTracking()
            .Where(e => e.LoyaltyAccountId == loyaltyAccountId);

        if (query.EntryType.HasValue)
            q = q.Where(e => e.EntryType == query.EntryType.Value);

        var totalCount = await q.CountAsync(ct);

        var items = await q
            .OrderByDescending(e => e.CreatedAtUtc)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task AddLedgerEntryAsync(LoyaltyLedgerEntry entry, CancellationToken ct)
    {
        await _db.LoyaltyLedgerEntries.AddAsync(entry, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<bool> HasEarnedForBookingAsync(Guid bookingId, CancellationToken ct)
        => await _db.LoyaltyLedgerEntries
            .AnyAsync(e => e.BookingId == bookingId && e.EntryType == LoyaltyEntryType.Earn, ct);

    public async Task<int> GetRedeemedPointsForBookingAsync(Guid bookingId, CancellationToken ct)
    {
        var netRedeemed = await _db.LoyaltyLedgerEntries
            .Where(e => e.BookingId == bookingId && e.EntryType == LoyaltyEntryType.Redeem)
            .SumAsync(e => (int?)e.Points, ct) ?? 0;

        return netRedeemed < 0 ? -netRedeemed : 0;
    }

    public async Task<bool> HasBookingAtBranchAsync(Guid userId, Guid branchId, CancellationToken ct)
        => await _db.Bookings.AnyAsync(b => b.UserId == userId && b.BranchId == branchId, ct);

    public async Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default)
        => await _db.Database.BeginTransactionAsync(ct);

    public async Task AcquireUserLockAsync(Guid userId, CancellationToken ct = default)
    {
        var resource = $"AutoWashingCar:Loyalty:User:{userId:N}";
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            EXEC sp_getapplock
                @Resource = {resource},
                @LockMode = N'Exclusive',
                @LockOwner = N'Transaction',
                @LockTimeout = -1;
            """, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
        => await _db.SaveChangesAsync(ct);
}
