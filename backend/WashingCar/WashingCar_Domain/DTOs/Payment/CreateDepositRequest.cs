using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Payment;

/// <summary>Khởi tạo thanh toán online qua VNPay cho 1 booking đang Pending.</summary>
public class CreateDepositRequest
{
    [Required] public Guid BookingId { get; set; }

    /// <summary>true = trả đủ 100% (FullPayment); false = đặt cọc theo DepositPercent (mặc định 50%).</summary>
    public bool PayFull { get; set; }

    public string? FrontendUrl { get; set; }
}
