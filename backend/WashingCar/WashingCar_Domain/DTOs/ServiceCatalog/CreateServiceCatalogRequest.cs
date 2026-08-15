using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.ServiceCatalog;

public class CreateServiceCatalogRequest
{
    [Required]
    [StringLength(100)]
    public string ServiceName { get; set; } = null!;

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(0.01, 100_000_000)]
    public decimal BasePrice { get; set; }

    [Range(1, 480)]
    public short DurationMinutes { get; set; }

    /// <summary>1=Standard, 2=AddOn, 3=Premium.</summary>
    [Range(1, 3)]
    public byte ServicePackageType { get; set; } = 1;
}
