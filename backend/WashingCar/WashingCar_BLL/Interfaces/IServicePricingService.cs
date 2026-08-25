using WashingCar_Domain.DTOs.ServicePricing;

namespace WashingCar_BLL.Interfaces;

public interface IServicePricingService
{
    Task<ServicePricingResolution?> ResolveAsync(
        Guid serviceCatalogItemId,
        byte vehicleType,
        Guid? engineCatalogId,
        CancellationToken ct = default);

    Task<IReadOnlyList<ServicePricingDto>> GetForServiceAsync(
        Guid serviceCatalogItemId,
        bool includeInactive,
        CancellationToken ct = default);

    Task<ServicePricingDto> CreateAsync(
        CreateServicePricingRequest request,
        CancellationToken ct = default);

    Task<ServicePricingDto> UpdateAsync(
        Guid pricingId,
        UpdateServicePricingRequest request,
        CancellationToken ct = default);

    Task SetActiveAsync(Guid pricingId, bool isActive, CancellationToken ct = default);
}
