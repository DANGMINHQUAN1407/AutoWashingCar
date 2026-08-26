using System;
using WashingCar_Common.Enum;

namespace WashingCar_DAL.Entities;

/// <summary>
/// Giá và khả năng áp dụng của một dịch vụ leaf theo loại phương tiện và động cơ.
/// EngineCatalogId = null là giá mặc định cho toàn bộ động cơ của VehicleType.
/// </summary>
public class ServiceVehiclePricing
{
    public Guid ServiceVehiclePricingId { get; set; }

    public Guid ServiceCatalogItemId { get; set; }

    public VehicleType VehicleType { get; set; }

    public Guid? EngineCatalogId { get; set; }

    public decimal UnitPrice { get; set; }

    public short DurationMinutes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public virtual ServiceCatalogItem ServiceCatalogItem { get; set; } = null!;

    public virtual VehicleEngineCatalog? EngineCatalog { get; set; }
}
