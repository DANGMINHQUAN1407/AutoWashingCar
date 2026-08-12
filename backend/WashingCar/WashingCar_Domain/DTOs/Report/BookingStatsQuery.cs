using WashingCar_Common.Enum;

namespace WashingCar_Domain.DTOs.Report;

public class BookingStatsQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate   { get; set; }
    public byte      GroupBy  { get; set; } = ReportPeriod.Week; // Day | Week | Month
    public Guid?     BranchId { get; set; } // chỉ Admin dùng để lọc 1 chi nhánh; Manager luôn lấy branch của mình
}
