using System.ComponentModel.DataAnnotations;
using WashingCar_Common.Enum;

namespace WashingCar_Domain.DTOs.VehicleCatalog;

public class CreateVehicleCatalogRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Code { get; set; } = null!;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = null!;

    /// <summary>Required for body-style catalogs; ignored for engine catalogs.</summary>
    public VehicleType? VehicleType { get; set; }
}
