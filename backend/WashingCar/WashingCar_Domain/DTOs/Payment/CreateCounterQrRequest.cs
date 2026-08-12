using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Payment;

/// <summary>Tạo QR VNPay tại quầy để khách quét thanh toán phần còn lại.</summary>
public class CreateCounterQrRequest
{
    [Required] public Guid BookingId { get; set; }

    public string? FrontendUrl { get; set; }
}
