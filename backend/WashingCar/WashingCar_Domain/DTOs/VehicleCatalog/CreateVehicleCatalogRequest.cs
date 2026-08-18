using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.VehicleCatalog;

public class CreateVehicleCatalogRequest
{
    [Required]
    [StringLength(50, MinimumLength = 1)]
    public string Code { get; set; } = null!;

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = null!;
}
