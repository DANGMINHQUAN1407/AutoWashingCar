using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_BLL.Interfaces;

public interface IVehicleCatalogService
{
    Task<PagedResult<VehicleCatalogItemDto>> GetEngineTypesAsync(VehicleCatalogQuery query);
    Task<PagedResult<VehicleCatalogItemDto>> GetBodyStylesAsync(VehicleCatalogQuery query);
    Task<VehicleCatalogItemDto> GetEngineTypeByIdAsync(Guid id);
    Task<VehicleCatalogItemDto> GetBodyStyleByIdAsync(Guid id);
    Task<VehicleCatalogItemDto> CreateEngineTypeAsync(CreateVehicleCatalogRequest request);
    Task<VehicleCatalogItemDto> UpdateEngineTypeAsync(Guid id, UpdateVehicleCatalogRequest request);
    Task SetEngineTypeActiveAsync(Guid id, bool isActive);
    Task<VehicleCatalogItemDto> CreateBodyStyleAsync(CreateVehicleCatalogRequest request);
    Task<VehicleCatalogItemDto> UpdateBodyStyleAsync(Guid id, UpdateVehicleCatalogRequest request);
    Task SetBodyStyleActiveAsync(Guid id, bool isActive);

    Task<PagedResult<VehicleCatalogItemDto>> GetBrandsAsync(VehicleCatalogQuery query);
    Task<VehicleCatalogItemDto> GetBrandByIdAsync(Guid id);
    Task<VehicleCatalogItemDto> CreateBrandAsync(CreateVehicleCatalogRequest request);
    Task<VehicleCatalogItemDto> UpdateBrandAsync(Guid id, UpdateVehicleCatalogRequest request);
    Task SetBrandActiveAsync(Guid id, bool isActive);
}
