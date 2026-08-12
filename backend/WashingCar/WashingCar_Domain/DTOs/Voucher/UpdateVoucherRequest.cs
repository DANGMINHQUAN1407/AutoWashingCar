using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Voucher;

public class UpdateVoucherRequest
{
    [Required]
    [StringLength(50)]
    public string VoucherCode { get; set; } = null!;

    [Required]
    [Range(1, 3)]
    public byte VoucherType { get; set; }

    [Required]
    [Range(1, 2)]
    public byte DiscountType { get; set; }

    [Required]
    [Range(0.01, 999999999)]
    public decimal DiscountValue { get; set; }

    [Range(0, 999999999)]
    public decimal? MinOrderAmount { get; set; }

    [Range(0, 999999999)]
    public decimal? MaxDiscountAmount { get; set; }

    [Required]
    [Range(1, 10000000)]
    public int Quantity { get; set; }

    [Required]
    public DateTime StartUtc { get; set; }

    [Required]
    public DateTime EndUtc { get; set; }

    public int RequiredPoints { get; set; }

    public Guid? BranchId { get; set; }
}
