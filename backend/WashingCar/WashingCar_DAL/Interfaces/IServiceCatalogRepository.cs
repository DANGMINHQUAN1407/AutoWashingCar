using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_DAL.Interfaces;

public interface IServiceCatalogRepository
{
    Task<(List<ServiceCatalogItem> Items, int TotalCount)> GetAllPaginatedAsync(ServiceCatalogQuery query);
    Task<ServiceCatalogItem?>  GetByIdAsync(Guid id);
    Task<bool>                 ExistsNameAsync(string name, Guid? excludeId = null);
    Task<ServiceCatalogItem>   CreateAsync(ServiceCatalogItem item);
    Task                       UpdateAsync(ServiceCatalogItem item);
}
