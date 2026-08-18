using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.VehicleCatalog;

public class VehicleCatalogQuery : PaginationQuery
{
    public string? Search { get; set; }
    public bool? IsActive { get; set; }
}
