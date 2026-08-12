using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Tier;

namespace WashingCar_BLL.Interfaces;

public interface ITierService
{
    Task<PagedResult<TierDto>> GetAllPaginatedAsync(TierQuery query, CancellationToken ct = default);
    Task<List<TierDto>> GetAllActiveAsync(CancellationToken ct = default);
    Task<TierDto> GetByIdAsync(Guid tierId, CancellationToken ct = default);
    Task<TierDto> CreateAsync(CreateTierRequest request, CancellationToken ct = default);
    Task<TierDto> UpdateAsync(Guid tierId, UpdateTierRequest request, CancellationToken ct = default);
    Task SetActiveAsync(Guid tierId, bool isActive, CancellationToken ct = default);
}
