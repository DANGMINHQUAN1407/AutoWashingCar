namespace WashingCar_DAL.Entities;

public class VehicleOwnershipHistory
{
    public Guid VehicleOwnershipHistoryId { get; set; }
    public Guid VehicleId { get; set; }
    public Guid UserId { get; set; }
    public DateTime OwnedFromUtc { get; set; }
    public DateTime? OwnedToUtc { get; set; }
    public Guid? VehicleTransferRequestId { get; set; }
    public Guid? RecordedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    public virtual Vehicle Vehicle { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual VehicleTransferRequest? VehicleTransferRequest { get; set; }
    public virtual User? RecordedByUser { get; set; }
}
