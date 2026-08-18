using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_DAL.Interfaces;

public interface IVehicleEngineCatalogRepository
{
    Task<(List<VehicleEngineCatalog> Items, int TotalCount)> GetAllPaginatedAsync(VehicleCatalogQuery query);
    Task<VehicleEngineCatalog?> GetByIdAsync(Guid id);
    Task<bool> ExistsCodeAsync(string code, Guid? excludeId = null);
    Task<bool> ExistsNameAsync(string name, Guid? excludeId = null);
    Task<VehicleEngineCatalog> CreateAsync(VehicleEngineCatalog item);
    Task UpdateAsync(VehicleEngineCatalog item);
}
