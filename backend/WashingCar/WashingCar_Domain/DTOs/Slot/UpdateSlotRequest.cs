using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Slot;

public class UpdateSlotRequest
{
    [Range(1, 200)] public short Capacity { get; set; }
}
