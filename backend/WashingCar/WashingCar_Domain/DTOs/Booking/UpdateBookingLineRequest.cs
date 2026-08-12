using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

public class UpdateBookingLineRequest
{
    [Range(1, 50)] public short Quantity { get; set; }
}
