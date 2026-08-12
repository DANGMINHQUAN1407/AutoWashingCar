using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Tier;

namespace WashingCar_DAL.Repositories;

public class TierRepository(WashingCarDbContext db) : ITierRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<(List<Tier> Items, int TotalCount)> GetAllPaginatedAsync(TierQuery query, CancellationToken ct)
    {
        var q = _db.Tiers.AsNoTracking().AsQueryable();

        if (query.IsActive.HasValue)
            q = q.Where(t => t.IsActive == query.IsActive.Value);

        var totalCount = await q.CountAsync(ct);

        q = query.SortBy?.ToLower() switch
        {
            "tiername"  => query.SortDesc ? q.OrderByDescending(t => t.TierName)  : q.OrderBy(t => t.TierName),
            "earnrate"  => query.SortDesc ? q.OrderByDescending(t => t.EarnRate)  : q.OrderBy(t => t.EarnRate),
            _           => q.OrderBy(t => t.MinPoints),
        };

        var items = await q.Skip(query.Skip).Take(query.PageSize).ToListAsync(ct);
        return (items, totalCount);
    }

    public async Task<List<Tier>> GetAllActiveOrderedAsync(CancellationToken ct)
        => await _db.Tiers
            .AsNoTracking()
            .Where(t => t.IsActive)
            .OrderBy(t => t.MinPoints)
            .ToListAsync(ct);

    public async Task<Tier?> GetByIdAsync(Guid tierId, CancellationToken ct)
        => await _db.Tiers.FirstOrDefaultAsync(t => t.TierId == tierId, ct);

    public async Task<bool> ExistsNameAsync(string tierName, Guid? excludeId, CancellationToken ct)
        => await _db.Tiers.AnyAsync(t => t.TierName == tierName
            && (excludeId == null || t.TierId != excludeId.Value), ct);

    public async Task<bool> ExistsMinPointsAsync(int minPoints, Guid? excludeId, CancellationToken ct)
        => await _db.Tiers.AnyAsync(t => t.MinPoints == minPoints
            && (excludeId == null || t.TierId != excludeId.Value), ct);

    public async Task<bool> HasLoyaltyAccountsAsync(Guid tierId, CancellationToken ct)
        => await _db.LoyaltyAccounts.AnyAsync(la => la.TierId == tierId, ct);

    public async Task AddAsync(Tier tier, CancellationToken ct)
    {
        await _db.Tiers.AddAsync(tier, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
        => await _db.SaveChangesAsync(ct);
}
