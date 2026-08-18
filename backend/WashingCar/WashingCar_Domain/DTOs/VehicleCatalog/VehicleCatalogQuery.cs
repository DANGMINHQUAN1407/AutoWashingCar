using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.VehicleCatalog;

public class VehicleCatalogQuery : PaginationQuery
{
    public string? Search { get; set; }
    public bool? IsActive { get; set; }
    public VehicleType? VehicleType { get; set; }
}
