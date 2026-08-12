using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Voucher;

public class UserVoucherQuery : PaginationQuery
{
    public byte? VoucherStatus { get; set; }
    public Guid? BranchId { get; set; }
}
