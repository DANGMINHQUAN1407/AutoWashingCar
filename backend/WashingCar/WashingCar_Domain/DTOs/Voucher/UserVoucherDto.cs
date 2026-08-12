namespace WashingCar_Domain.DTOs.Voucher;

public class UserVoucherDto
{
    public Guid UserVoucherId { get; set; }
    public Guid UserId { get; set; }
    public Guid VoucherId { get; set; }
    public string VoucherCode { get; set; } = null!;
    public byte VoucherType { get; set; }
    public string VoucherTypeName { get; set; } = null!;
    public byte DiscountType { get; set; }
    public string DiscountTypeName { get; set; } = null!;
    public decimal DiscountValue { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public byte VoucherStatus { get; set; }
    public string VoucherStatusName { get; set; } = null!;
    public int RedeemedPoints { get; set; }
    public DateTime RedeemedAtUtc { get; set; }
    public DateTime? ExpiredAtUtc { get; set; }
    public DateTime? UsedAtUtc { get; set; }
}
