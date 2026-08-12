using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Voucher;

public class RedeemVoucherRequest
{
    [Required]
    public Guid VoucherId { get; set; }
}
