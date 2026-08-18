namespace WashingCar_Domain.DTOs.VehicleCatalog;

public class VehicleCatalogItemDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; }
    public byte? LegacyEnumValue { get; set; }
}
