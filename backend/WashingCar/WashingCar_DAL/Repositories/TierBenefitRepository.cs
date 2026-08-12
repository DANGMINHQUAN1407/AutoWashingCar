using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;

namespace WashingCar_DAL.Repositories;

public class TierBenefitRepository(WashingCarDbContext db) : ITierBenefitRepository
{
    private readonly WashingCarDbContext _db = db;

    // Lấy danh sách benefits của 1 tier, sắp xếp theo BenefitType
    public async Task<List<TierBenefit>> GetByTierIdAsync(Guid tierId, CancellationToken ct)
        => await _db.TierBenefits
            .AsNoTracking()
            .Where(b => b.TierId == tierId)
            .OrderBy(b => b.BenefitType)
            .ToListAsync(ct);

    // Lấy 1 benefit (có tracking để update/delete)
    public async Task<TierBenefit?> GetByIdAsync(Guid tierBenefitId, CancellationToken ct)
        => await _db.TierBenefits.FirstOrDefaultAsync(b => b.TierBenefitId == tierBenefitId, ct);

    // Check unique constraint: 1 tier chỉ 1 benefit mỗi type
    public async Task<bool> ExistsAsync(Guid tierId, byte benefitType, Guid? excludeId, CancellationToken ct)
        => await _db.TierBenefits.AnyAsync(b => b.TierId == tierId
            && b.BenefitType == benefitType
            && (excludeId == null || b.TierBenefitId != excludeId.Value), ct);

    public async Task AddAsync(TierBenefit benefit, CancellationToken ct)
    {
        await _db.TierBenefits.AddAsync(benefit, ct);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(TierBenefit benefit, CancellationToken ct)
    {
        _db.TierBenefits.Remove(benefit);
        await _db.SaveChangesAsync(ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct)
        => await _db.SaveChangesAsync(ct);
}
