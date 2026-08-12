using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Report;

namespace WashingCar_API.Controllers;

/// <summary>
/// Báo cáo thống kê. ReportService không dùng Repository riêng cho phần dashboard —
/// truy vấn thẳng WashingCarDbContext vì cần LINQ tổng hợp linh hoạt (Sum/Count/GroupBy nhiều bảng).
/// </summary>
[Route("api/reports")]
[ApiController]
public class ReportController(IReportService reportService) : BaseApiController
{
    /// <summary>Dashboard tổng quan toàn hệ thống (Admin).</summary>
    /// <remarks>
    /// Gọi: ReportService.GetAdminDashboardStatsAsync → truy vấn trực tiếp db.Branches, db.Users, db.Bookings (AsNoTracking).
    /// </remarks>
    [HttpGet("dashboard")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetAdminDashboard(CancellationToken ct)
    {
        var stats = await reportService.GetAdminDashboardStatsAsync(ct);
        return Success(stats);
    }

    /// <summary>Dashboard chi nhánh của Manager.</summary>
    /// <remarks>
    /// Gọi: ReportService.GetManagerDashboardStatsAsync → db.Branches.FirstOrDefaultAsync(ManagerId)
    /// → db.BranchServices, db.Bookings (lọc theo BranchId).
    /// </remarks>
    [HttpGet("branch-dashboard")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> GetManagerDashboard(CancellationToken ct)
    {
        var stats = await reportService.GetManagerDashboardStatsAsync(CurrentUserId, ct);
        return Success(stats);
    }

    /// <summary>Số lượng + tổng giá trị booking Online/WalkIn theo ngày/tuần/tháng — toàn hệ thống.</summary>
    /// <remarks>
    /// Gọi: ReportService.GetAdminBookingStatsAsync → helper BuildStatsAsync → IBookingRepository.GetForStatsAsync
    /// (group theo Day/Week/Month trong bộ nhớ, không GroupBy trên SQL).
    /// </remarks>
    [HttpGet("booking-stats")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetAdminBookingStats([FromQuery] BookingStatsQuery query, CancellationToken ct)
    {
        var stats = await reportService.GetAdminBookingStatsAsync(query, ct);
        return Success(stats);
    }

    /// <summary>Số lượng + tổng giá trị booking Online/WalkIn theo ngày/tuần/tháng — chi nhánh của Manager.</summary>
    /// <remarks>
    /// Gọi: ReportService.GetManagerBookingStatsAsync → db.Branches.FirstOrDefaultAsync(ManagerId) → helper BuildStatsAsync
    /// (ép cứng branch.BranchId, bỏ qua query.BranchId client gửi lên — chặn Manager xem chéo chi nhánh).
    /// </remarks>
    [HttpGet("branch-booking-stats")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> GetManagerBookingStats([FromQuery] BookingStatsQuery query, CancellationToken ct)
    {
        var stats = await reportService.GetManagerBookingStatsAsync(CurrentUserId, query, ct);
        return Success(stats);
    }
}
