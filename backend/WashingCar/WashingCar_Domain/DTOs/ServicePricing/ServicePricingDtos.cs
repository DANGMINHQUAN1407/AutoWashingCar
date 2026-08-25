using System.ComponentModel.DataAnnotations;
using WashingCar_Common.Enum;

namespace WashingCar_Domain.DTOs.ServicePricing;

public class ServicePricingResolution
{
    public Guid ServiceVehiclePricingId { get; set; }
    public Guid ServiceCatalogItemId { get; set; }
    public VehicleType VehicleType { get; set; }
    public Guid? EngineCatalogId { get; set; }
    public decimal UnitPrice { get; set; }
    public short DurationMinutes { get; set; }
    public bool IsEngineSpecific { get; set; }
}

public class ServicePricingDto
{
    public Guid ServiceVehiclePricingId { get; set; }
    public Guid ServiceCatalogItemId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public VehicleType VehicleType { get; set; }
    public Guid? EngineCatalogId { get; set; }
    public string? EngineName { get; set; }
    public decimal UnitPrice { get; set; }
    public short DurationMinutes { get; set; }
    public bool IsActive { get; set; }
}

public class CreateServicePricingRequest
{
    [Required]
    public Guid ServiceCatalogItemId { get; set; }

    [EnumDataType(typeof(VehicleType))]
    public VehicleType VehicleType { get; set; }

    public Guid? EngineCatalogId { get; set; }

    [Range(typeof(decimal), "0.01", "999999999999")]
    public decimal UnitPrice { get; set; }

    [Range(1, short.MaxValue)]
    public short DurationMinutes { get; set; }
}

public class UpdateServicePricingRequest
{
    [Range(typeof(decimal), "0.01", "999999999999")]
    public decimal UnitPrice { get; set; }

    [Range(1, short.MaxValue)]
    public short DurationMinutes { get; set; }

    public bool IsActive { get; set; }
}
