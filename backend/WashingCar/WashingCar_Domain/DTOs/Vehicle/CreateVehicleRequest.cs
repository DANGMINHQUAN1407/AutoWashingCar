using System.ComponentModel.DataAnnotations;
using WashingCar_Common.Enum;
using WashingCar_Domain.Validation;

namespace WashingCar_Domain.DTOs.Vehicle;

public class CreateVehicleRequest
{
    [Required]
    [StringLength(20, MinimumLength = 6)]
    public string LicensePlate { get; set; } = null!;

    [Required]
    [EnumDataType(typeof(VehicleType))]
    public VehicleType VehicleType { get; set; }

    [StringLength(50)]
    public string? Brand { get; set; }

    [StringLength(100)]
    public string? Model { get; set; }

    [ManufactureYear]
    public int? ManufactureYear { get; set; }

    [EnumDataType(typeof(EngineType))]
    public EngineType? EngineType { get; set; }

    [EnumDataType(typeof(BodyStyle))]
    public BodyStyle? BodyStyle { get; set; }
}
