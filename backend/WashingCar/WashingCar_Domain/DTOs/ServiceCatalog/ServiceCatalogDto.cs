namespace WashingCar_Domain.DTOs.ServiceCatalog;

public class ServiceCatalogDto
{
    public Guid    ServiceCatalogItemId { get; set; }
    public string  ServiceName          { get; set; } = null!;
    public string? Description          { get; set; }
    public decimal  BasePrice            { get; set; }
    public short   DurationMinutes      { get; set; }

    /// <summary>Giá/thời lượng đã resolve theo query VehicleType + EngineCatalogId.</summary>
    public decimal? ApplicablePrice { get; set; }
    public short? ApplicableDurationMinutes { get; set; }
    public byte    ServicePackageType   { get; set; }
    public string  ServicePackageTypeName { get; set; } = null!;
    public byte    ServiceNodeType      { get; set; }
    public string  ServiceNodeTypeName  { get; set; } = null!;
    public Guid?   ParentServiceCatalogItemId { get; set; }
    public byte?   SelectionMode        { get; set; }
    public bool    IsBookable           { get; set; }
    public bool    IsActive             { get; set; }
    public DateTime CreatedAtUtc        { get; set; }
}
