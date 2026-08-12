using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.ServiceCatalog;

public class ServiceCatalogQuery : PaginationQuery
{
    public string? Search    { get; set; }
    public bool?   IsActive  { get; set; }
}
