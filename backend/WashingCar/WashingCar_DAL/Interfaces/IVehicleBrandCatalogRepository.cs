using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_DAL.Interfaces;

public interface IVehicleBrandCatalogRepository
{
    Task<(List<VehicleBrandCatalog> Items, int TotalCount)> GetAllPaginatedAsync(VehicleCatalogQuery query);
    Task<VehicleBrandCatalog?> GetByIdAsync(Guid id);
    Task<bool> ExistsCodeAsync(string code, Guid? excludeId = null);
    Task<bool> ExistsNameAsync(string name, Guid? excludeId = null);
    Task<VehicleBrandCatalog> CreateAsync(VehicleBrandCatalog item);
    Task UpdateAsync(VehicleBrandCatalog item);
}
