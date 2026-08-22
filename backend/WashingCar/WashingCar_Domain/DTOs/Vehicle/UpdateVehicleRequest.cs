using System.ComponentModel.DataAnnotations;
using WashingCar_Common.Enum;
using WashingCar_Domain.Validation;

namespace WashingCar_Domain.DTOs.Vehicle;

public class UpdateVehicleRequest
{
    [Required]
    [StringLength(20, MinimumLength = 6)]
    public string LicensePlate { get; set; } = null!;

    [Required]
    [EnumDataType(typeof(VehicleType))]
    public VehicleType VehicleType { get; set; }

    [StringLength(50)]
    public string? Brand { get; set; }

    /// <summary>Brand catalog động. Nếu có, catalog là nguồn chính và Brand được đồng bộ theo Name.</summary>
    public Guid? BrandCatalogId { get; set; }

    [StringLength(100)]
    public string? Model { get; set; }

    [ManufactureYear]
    public int? ManufactureYear { get; set; }

    [EnumDataType(typeof(EngineType))]
    public EngineType? EngineType { get; set; }

    [EnumDataType(typeof(BodyStyle))]
    public BodyStyle? BodyStyle { get; set; }

    /// <summary>Catalog động cơ động. Nếu có, giá trị này được ưu tiên hơn EngineType legacy.</summary>
    public Guid? EngineCatalogId { get; set; }

    /// <summary>Catalog kiểu dáng động. Nếu có, giá trị này được ưu tiên hơn BodyStyle legacy.</summary>
    public Guid? BodyStyleCatalogId { get; set; }

    public Guid? BrandCatalogId { get; set; }
}
