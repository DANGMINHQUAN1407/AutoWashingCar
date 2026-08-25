namespace WashingCar_DAL.Entities;

public class VehicleTransferRequest
{
    public Guid VehicleTransferRequestId { get; set; }
    public Guid VehicleId { get; set; }
    public Guid FromUserId { get; set; }
    public Guid ToUserId { get; set; }
    public byte Status { get; set; }
    public string? Reason { get; set; }
    public string? ReviewNote { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? ReviewedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = null!;

    public virtual Vehicle Vehicle { get; set; } = null!;
    public virtual User FromUser { get; set; } = null!;
    public virtual User ToUser { get; set; } = null!;
    public virtual User? ReviewedByUser { get; set; }
    public virtual ICollection<VehicleOwnershipHistory> OwnershipHistories { get; set; } = new List<VehicleOwnershipHistory>();
}
