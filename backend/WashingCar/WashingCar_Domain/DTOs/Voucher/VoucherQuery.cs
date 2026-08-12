using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Voucher;

public class VoucherQuery : PaginationQuery
{
    public Guid? BranchId { get; set; }
    public bool? IsActive { get; set; }
    public byte? ApprovalStatus { get; set; }
    public byte? VoucherType { get; set; }
    public string? SearchCode { get; set; }
}
