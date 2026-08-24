using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;

namespace WashingCar_DAL.Repositories;

public class ServiceVehiclePricingRepository(WashingCarDbContext db) : IServiceVehiclePricingRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<ServiceVehiclePricing?> GetBestActiveAsync(
        Guid serviceCatalogItemId,
        byte vehicleType,
        Guid? engineCatalogId,
        CancellationToken ct = default)
    {
        if (engineCatalogId.HasValue)
        {
            var exact = await _db.ServiceVehiclePricings
                .AsNoTracking()
                .Include(x => x.ServiceCatalogItem)
                .Include(x => x.EngineCatalog)
                .FirstOrDefaultAsync(x =>
                    x.ServiceCatalogItemId == serviceCatalogItemId &&
                    (byte)x.VehicleType == vehicleType &&
                    x.EngineCatalogId == engineCatalogId &&
                    x.IsActive &&
                    x.EngineCatalog!.IsActive,
                    ct);

            if (exact is not null)
                return exact;
        }

        return await _db.ServiceVehiclePricings
            .AsNoTracking()
            .Include(x => x.ServiceCatalogItem)
            .Include(x => x.EngineCatalog)
            .FirstOrDefaultAsync(x =>
                x.ServiceCatalogItemId == serviceCatalogItemId &&
                (byte)x.VehicleType == vehicleType &&
                x.EngineCatalogId == null &&
                x.IsActive,
                ct);
    }

    public async Task<List<ServiceVehiclePricing>> GetForServiceAsync(
        Guid serviceCatalogItemId,
        bool includeInactive = false,
        CancellationToken ct = default)
        => await _db.ServiceVehiclePricings
            .AsNoTracking()
            .Include(x => x.ServiceCatalogItem)
            .Include(x => x.EngineCatalog)
            .Where(x => x.ServiceCatalogItemId == serviceCatalogItemId &&
                        (includeInactive || x.IsActive))
            .OrderBy(x => x.VehicleType)
            .ThenBy(x => x.EngineCatalogId.HasValue)
            .ThenBy(x => x.EngineCatalog!.Name)
            .ToListAsync(ct);

    public async Task<ServiceVehiclePricing?> GetByIdAsync(
        Guid pricingId,
        CancellationToken ct = default)
        => await _db.ServiceVehiclePricings
            .Include(x => x.ServiceCatalogItem)
            .Include(x => x.EngineCatalog)
            .FirstOrDefaultAsync(x => x.ServiceVehiclePricingId == pricingId, ct);

    public Task<bool> ExistsScopeAsync(
        Guid serviceCatalogItemId,
        byte vehicleType,
        Guid? engineCatalogId,
        Guid? excludeId = null,
        CancellationToken ct = default)
        => _db.ServiceVehiclePricings.AnyAsync(x =>
            x.ServiceCatalogItemId == serviceCatalogItemId &&
            (byte)x.VehicleType == vehicleType &&
            x.EngineCatalogId == engineCatalogId &&
            (!excludeId.HasValue || x.ServiceVehiclePricingId != excludeId.Value),
            ct);

    public async Task AddAsync(ServiceVehiclePricing pricing, CancellationToken ct = default)
        => await _db.ServiceVehiclePricings.AddAsync(pricing, ct);

    public Task UpdateAsync(ServiceVehiclePricing pricing, CancellationToken ct = default)
    {
        _db.ServiceVehiclePricings.Update(pricing);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);
}
