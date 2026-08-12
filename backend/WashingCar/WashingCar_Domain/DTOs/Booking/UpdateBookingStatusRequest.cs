using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

public class UpdateBookingStatusRequest
{
    [Range(1, 8)] public byte Status { get; set; }
}
