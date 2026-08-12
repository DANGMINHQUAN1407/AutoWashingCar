namespace WashingCar_Domain.DTOs.Voucher;

public class TierVoucherDto
{
    public Guid TierVoucherId { get; set; }
    public Guid TierId { get; set; }
    public string TierName { get; set; } = null!;
    public Guid VoucherId { get; set; }
    public string VoucherCode { get; set; } = null!;
    public int RequiredPoints { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
