using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Tier;

namespace WashingCar_DAL.Interfaces;

public interface ITierRepository
{
    Task<(List<Tier> Items, int TotalCount)> GetAllPaginatedAsync(TierQuery query, CancellationToken ct = default);
    Task<List<Tier>> GetAllActiveOrderedAsync(CancellationToken ct = default);
    Task<Tier?> GetByIdAsync(Guid tierId, CancellationToken ct = default);
    Task<bool> ExistsNameAsync(string tierName, Guid? excludeId = null, CancellationToken ct = default);
    Task<bool> ExistsMinPointsAsync(int minPoints, Guid? excludeId = null, CancellationToken ct = default);
    Task<bool> HasLoyaltyAccountsAsync(Guid tierId, CancellationToken ct = default);
    Task AddAsync(Tier tier, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
