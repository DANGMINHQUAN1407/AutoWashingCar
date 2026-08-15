namespace WashingCar_Domain.DTOs.Branch;

public class BranchServiceDto
{
    public Guid ServiceCatalogItemId { get; set; }
    public string ServiceName { get; set; } = null!;
    public string? Description { get; set; }
    public decimal BasePrice { get; set; }
    public short DurationMinutes { get; set; }
    public byte ServicePackageType { get; set; }
    public string ServicePackageTypeName { get; set; } = null!;
    public bool IsActive { get; set; }
    public DateTime AddedAtUtc { get; set; }
}
