using System.ComponentModel.DataAnnotations;
using WashingCar_Common.Enum;

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
}
