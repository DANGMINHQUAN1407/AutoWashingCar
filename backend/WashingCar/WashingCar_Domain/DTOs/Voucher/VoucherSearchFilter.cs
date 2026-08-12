namespace WashingCar_Domain.DTOs.Voucher;

public class VoucherSearchFilter
{
    public string? Code { get; set; }
    public byte? VoucherType { get; set; }
    public byte? ApprovalStatus { get; set; }
    public bool? IsActive { get; set; }
    public Guid? BranchId { get; set; }
    public bool IncludeSystemVouchers { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
