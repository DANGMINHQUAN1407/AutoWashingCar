using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Slot;

public class CreateSlotRequest
{
    [Required] public DateOnly SlotDate      { get; set; }
    [Required] public TimeOnly SlotStartTime { get; set; }
    [Required] public TimeOnly SlotEndTime   { get; set; }
    [Range(1, 200)] public short Capacity   { get; set; }
}
