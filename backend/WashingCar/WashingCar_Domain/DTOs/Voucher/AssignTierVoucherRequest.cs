using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Voucher;

public class AssignTierVoucherRequest
{
    [Required]
    public Guid TierId { get; set; }

    [Required]
    public Guid VoucherId { get; set; }

    [Required, Range(1, int.MaxValue)]
    public int RequiredPoints { get; set; }
}
