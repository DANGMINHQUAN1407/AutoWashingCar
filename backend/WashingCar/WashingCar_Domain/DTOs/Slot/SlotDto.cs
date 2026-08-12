namespace WashingCar_Domain.DTOs.Slot;

public class SlotDto
{
    public Guid     SlotInventoryId      { get; set; }
    public Guid     BranchId             { get; set; }
    public DateOnly SlotDate             { get; set; }
    public TimeOnly SlotStartTime        { get; set; }
    public TimeOnly SlotEndTime          { get; set; }
    public short    Capacity             { get; set; }
    public short    OnlineReservedCount  { get; set; }
    public short    WalkInReservedCount  { get; set; }
    public short    AvailableCount       { get; set; }
    public DateTime CreatedAtUtc         { get; set; }
}
