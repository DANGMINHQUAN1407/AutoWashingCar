namespace WashingCar_Domain.DTOs.ServiceCatalog;

public class ServiceCatalogDto
{
    public Guid    ServiceCatalogItemId { get; set; }
    public string  ServiceName          { get; set; } = null!;
    public string? Description          { get; set; }
    public decimal BasePrice            { get; set; }
    public short   DurationMinutes      { get; set; }
    public byte    ServicePackageType   { get; set; }
    public string  ServicePackageTypeName { get; set; } = null!;
    public bool    IsActive             { get; set; }
    public DateTime CreatedAtUtc        { get; set; }
}
