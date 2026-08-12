namespace WashingCar_Domain.DTOs.Voucher;

public class VoucherDto
{
    public Guid VoucherId { get; set; }
    public string VoucherCode { get; set; } = null!;
    public byte VoucherType { get; set; }
    public string VoucherTypeName { get; set; } = null!;
    public byte DiscountType { get; set; }
    public string DiscountTypeName { get; set; } = null!;
    public decimal DiscountValue { get; set; }
    public decimal? MinOrderAmount { get; set; }
    public decimal? MaxDiscountAmount { get; set; }
    public int Quantity { get; set; }
    public int UsedCount { get; set; }
    public DateTime StartUtc { get; set; }
    public DateTime EndUtc { get; set; }
    public int RequiredPoints { get; set; }
    public bool IsActive { get; set; }
    public byte ApprovalStatus { get; set; }
    public Guid? BranchId { get; set; }
    public string? BranchName { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByUserName { get; set; } = null!;
    public Guid? ApprovedByUserId { get; set; }
    public string? ApprovedByUserName { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
