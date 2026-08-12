using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

/// <summary>Check-in bằng mã QR (ưu tiên) hoặc mã booking — cần ít nhất 1 (kiểm tra ở BookingService).</summary>
public class CheckInRequest
{
    [StringLength(500)]
    public string? CheckInQrCode { get; set; }

    [StringLength(20)]
    public string? BookingCode   { get; set; }
}
