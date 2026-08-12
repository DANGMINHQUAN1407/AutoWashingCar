using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Payment;

/// <summary>Một phần tiền theo phương thức (Cash/Card/EWallet/LoyaltyPoints) trong thanh toán tại quầy.</summary>
public class TenderInputDto
{
    [Range(1, 4, ErrorMessage = "TenderType phải từ 1..4")]
    public byte TenderType { get; set; }

    [Range(0.01, double.MaxValue, ErrorMessage = "Số tiền phải lớn hơn 0")]
    public decimal Amount { get; set; }
}
