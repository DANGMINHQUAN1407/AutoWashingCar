using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.VehicleCatalog;

public class UpdateVehicleCatalogRequest
{
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = null!;

    public bool IsActive { get; set; }

    public bool IsLuxury { get; set; }
}
