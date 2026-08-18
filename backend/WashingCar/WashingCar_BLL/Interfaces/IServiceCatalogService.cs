using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_BLL.Interfaces;

public interface IServiceCatalogService
{
    Task<PagedResult<ServiceCatalogDto>> GetAllPaginatedAsync(ServiceCatalogQuery query);
    Task<List<ServiceCatalogTreeDto>>   GetTreeAsync(bool includeInactive = false);
    Task<ServiceCatalogDto>              GetByIdAsync(Guid id);
    Task<ServiceCatalogDto>              CreateAsync(CreateServiceCatalogRequest request, Guid? currentUserId = null, bool isManager = false);
    Task<ServiceCatalogDto>              UpdateAsync(Guid id, UpdateServiceCatalogRequest request);
    Task                                 SetActiveAsync(Guid id, bool isActive);
}
