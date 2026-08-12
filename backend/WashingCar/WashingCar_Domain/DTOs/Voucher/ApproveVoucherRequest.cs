using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Voucher;

public class ApproveVoucherRequest
{
    [Required]
    public byte ApprovalStatus { get; set; }
}
