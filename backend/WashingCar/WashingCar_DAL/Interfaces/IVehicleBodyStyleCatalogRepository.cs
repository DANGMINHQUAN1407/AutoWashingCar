using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_DAL.Interfaces;

public interface IVehicleBodyStyleCatalogRepository
{
    Task<(List<VehicleBodyStyleCatalog> Items, int TotalCount)> GetAllPaginatedAsync(VehicleCatalogQuery query);
    Task<VehicleBodyStyleCatalog?> GetByIdAsync(Guid id);
    Task<bool> ExistsCodeAsync(string code, Guid? excludeId = null);
    Task<bool> ExistsNameAsync(string name, Guid? excludeId = null);
    Task<VehicleBodyStyleCatalog> CreateAsync(VehicleBodyStyleCatalog item);
    Task UpdateAsync(VehicleBodyStyleCatalog item);
}
