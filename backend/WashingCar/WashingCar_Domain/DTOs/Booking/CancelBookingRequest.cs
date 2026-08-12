using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

public class CancelBookingRequest
{
    [StringLength(500)]
    public string? Reason { get; set; }
}
