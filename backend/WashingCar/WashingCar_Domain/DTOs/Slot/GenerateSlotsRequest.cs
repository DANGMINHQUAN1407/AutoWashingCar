using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Slot;

public class GenerateSlotsRequest
{
    [Required] public DateOnly FromDate  { get; set; }
    [Required] public DateOnly ToDate    { get; set; }
    [Required] public TimeOnly OpenTime  { get; set; }   // Giờ bắt đầu ca (vd: 08:00)
    [Required] public TimeOnly CloseTime { get; set; }   // Giờ kết thúc ca  (vd: 18:00)

    [Range(15, 480)] public int   SlotDurationMinutes { get; set; } = 60;
    [Range(1,  200)] public short Capacity            { get; set; } = 1;
}
