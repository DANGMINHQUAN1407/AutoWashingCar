using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.ServiceCatalog;

public class CreateServiceCatalogRequest
{
    [Required]
    [StringLength(100)]
    public string ServiceName { get; set; } = null!;

    [StringLength(500)]
    public string? Description { get; set; }

    [Range(0, 100_000_000)]
    public decimal BasePrice { get; set; }

    [Range(0, 480)]
    public short DurationMinutes { get; set; }

    /// <summary>1=Standard, 2=AddOn, 3=Premium.</summary>
    [Range(1, 3)]
    public byte ServicePackageType { get; set; } = 1;

    /// <summary>1=Group, 2=Leaf. Defaults to Leaf for backward compatibility.</summary>
    [Range(1, 2)]
    public byte ServiceNodeType { get; set; } = 2;

    /// <summary>Null means root. A child must point to an active Group.</summary>
    public Guid? ParentServiceCatalogItemId { get; set; }

    /// <summary>1=AllChildren. Required for Group and null for Leaf.</summary>
    [Range(1, 1)]
    public byte? SelectionMode { get; set; }
}
