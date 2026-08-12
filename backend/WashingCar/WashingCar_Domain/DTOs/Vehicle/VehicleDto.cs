using WashingCar_Common.Enum;

namespace WashingCar_Domain.DTOs.Vehicle;

public class VehicleDto
{
    public Guid        VehicleId    { get; set; }
    public string      LicensePlate { get; set; } = null!;
    public VehicleType VehicleType  { get; set; }
    public string?     Brand        { get; set; }
    public DateTime    CreatedAtUtc { get; set; }
}
