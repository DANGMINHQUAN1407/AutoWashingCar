using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.ServiceCatalog;

public class ServiceCatalogQuery : PaginationQuery
{
    public string? Search    { get; set; }
    public bool?   IsActive  { get; set; }

    /// <summary>Chỉ trả các leaf có rule giá active cho loại xe này.</summary>
    public VehicleType? VehicleType { get; set; }

    /// <summary>Engine cụ thể; resolver vẫn cho phép fallback về rule mặc định của VehicleType.</summary>
    public Guid? EngineCatalogId { get; set; }

    /// <summary>Nếu có, chỉ trả leaf đang được bật tại chi nhánh này.</summary>
    public Guid? BranchId { get; set; }
}
