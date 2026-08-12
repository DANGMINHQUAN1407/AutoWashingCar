using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Booking;

public class BookingQuery : PaginationQuery
{
    public byte?     Status   { get; set; }  // lọc theo BookingStatus
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate   { get; set; }
    public string?   Search   { get; set; }  // theo BookingCode
    public Guid?     BranchId { get; set; }  // Admin/Manager lọc; Staff lấy từ token
}
