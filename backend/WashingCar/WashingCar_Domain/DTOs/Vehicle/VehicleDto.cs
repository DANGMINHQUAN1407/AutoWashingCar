using WashingCar_Common.Enum;

namespace WashingCar_Domain.DTOs.Vehicle;

public class VehicleDto
{
    public Guid        VehicleId    { get; set; }
    public string      LicensePlate { get; set; } = null!;
    public VehicleType VehicleType  { get; set; }
    public string?     Brand        { get; set; }
    public string?     Model        { get; set; }
    public int?        ManufactureYear { get; set; }
    public EngineType? EngineType   { get; set; }
    public BodyStyle?  BodyStyle    { get; set; }
    public Guid?       EngineCatalogId { get; set; }
    public string?     EngineCatalogName { get; set; }
    public Guid?       BodyStyleCatalogId { get; set; }
    public string?     BodyStyleCatalogName { get; set; }
    public string      VehicleCondition { get; set; } = null!;
    public string?     PrimaryImageUrl { get; set; }
    public DateTime    CreatedAtUtc { get; set; }
}
