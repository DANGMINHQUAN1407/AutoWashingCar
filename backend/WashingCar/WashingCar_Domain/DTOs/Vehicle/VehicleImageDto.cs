namespace WashingCar_Domain.DTOs.Vehicle;

public class VehicleImageDto
{
    public Guid VehicleImageId { get; set; }
    public string ImageUrl { get; set; } = null!;
    public bool IsPrimary { get; set; }
    public int DisplayOrder { get; set; }
    public DateTime UploadedAtUtc { get; set; }
}
