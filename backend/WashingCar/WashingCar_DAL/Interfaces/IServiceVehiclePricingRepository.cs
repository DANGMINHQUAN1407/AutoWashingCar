using WashingCar_DAL.Entities;

namespace WashingCar_DAL.Interfaces;

public interface IServiceVehiclePricingRepository
{
    Task<ServiceVehiclePricing?> GetBestActiveAsync(
        Guid serviceCatalogItemId,
        byte vehicleType,
        Guid? engineCatalogId,
        CancellationToken ct = default);

    Task<List<ServiceVehiclePricing>> GetForServiceAsync(
        Guid serviceCatalogItemId,
        bool includeInactive = false,
        CancellationToken ct = default);

    Task<ServiceVehiclePricing?> GetByIdAsync(
        Guid pricingId,
        CancellationToken ct = default);

    Task<bool> ExistsScopeAsync(
        Guid serviceCatalogItemId,
        byte vehicleType,
        Guid? engineCatalogId,
        Guid? excludeId = null,
        CancellationToken ct = default);

    Task AddAsync(ServiceVehiclePricing pricing, CancellationToken ct = default);
    Task UpdateAsync(ServiceVehiclePricing pricing, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
