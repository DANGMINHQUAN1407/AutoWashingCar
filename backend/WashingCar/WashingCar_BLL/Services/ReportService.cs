using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_Common.Constant;
using WashingCar_Common.Helpers;
using WashingCar_DAL.Data;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Report;

namespace WashingCar_BLL.Services;

/// <summary>
/// Báo cáo thống kê. Không dùng Repository riêng cho phần dashboard — inject thẳng WashingCarDbContext
/// vì cần LINQ tổng hợp linh hoạt (Sum/Count/GroupBy nhiều bảng) không đáng bọc Repository riêng cho mỗi query.
/// Chỉ phần group-by theo kỳ (booking-stats) dùng lại IBookingRepository.
/// </summary>
public class ReportService(WashingCarDbContext db, IBookingRepository bookingRepo) : IReportService
{
    /// <summary>Dashboard tổng quan toàn hệ thống (Admin) — số chi nhánh, staff, doanh thu, network health.</summary>
    /// <remarks>Gọi: truy vấn trực tiếp db.Branches, db.Users, db.Bookings (AsNoTracking) — không qua Repository.</remarks>
    public async Task<DashboardStatsDto> GetAdminDashboardStatsAsync(CancellationToken ct = default)
    {
        var branches = await db.Branches.AsNoTracking().ToListAsync(ct);
        var activeBranches = branches.Count(b => b.IsActive);

        var staffCount = await db.Users.AsNoTracking()
            .CountAsync(u => u.Role == UserRole.Staff || u.Role == UserRole.Manager, ct);

        var completedStatuses = new byte[] { BookingStatus.Completed, BookingStatus.Closed };
        var systemRevenue = await db.Bookings.AsNoTracking()
            .Where(b => completedStatuses.Contains(b.BookingStatus))
            .SumAsync(b => b.BookingFinalAmount, ct);

        var networkHealth = branches.Count > 0
            ? (int)Math.Round((double)activeBranches / branches.Count * 100)
            : 0;

        var tenWeeksAgo = DateTime.UtcNow.Date.AddDays(-70);
        var recentBookings = await db.Bookings.AsNoTracking()
            .Where(b => completedStatuses.Contains(b.BookingStatus) && b.CreatedAtUtc >= tenWeeksAgo)
            .Select(b => new { b.CreatedAtUtc, b.BookingFinalAmount })
            .ToListAsync(ct);

        var weeklyRevenues = new decimal[10];
        var now = DateTime.UtcNow.Date;

        foreach (var b in recentBookings)
        {
            var diff = (now - b.CreatedAtUtc.Date).Days;
            if (diff >= 0 && diff < 70)
            {
                var weekIndex = 9 - (diff / 7);
                weeklyRevenues[weekIndex] += b.BookingFinalAmount;
            }
        }

        var maxRev = weeklyRevenues.Length > 0 ? weeklyRevenues.Max() : 0;
        var revenueWeeks = weeklyRevenues.Select(r => maxRev > 0 ? (int)(r * 100 / maxRev) : 0).ToList();

        var currentMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var monthlyWashes = await db.Bookings.AsNoTracking()
            .CountAsync(b => completedStatuses.Contains(b.BookingStatus) && b.CreatedAtUtc >= currentMonthStart, ct);

        return new DashboardStatsDto
        {
            TotalBranches = branches.Count,
            ActiveBranches = activeBranches,
            TotalStaff = staffCount,
            SystemRevenue = systemRevenue,
            NetworkHealth = networkHealth,
            MonthlyWashes = monthlyWashes,
            RevenueWeeks = revenueWeeks
        };
    }

    /// <summary>Dashboard chi nhánh của Manager — số dịch vụ, doanh thu chi nhánh, đơn đang xử lý.</summary>
    /// <remarks>Gọi: db.Branches.FirstOrDefaultAsync(ManagerId) → db.BranchServices, db.Bookings (lọc theo BranchId).</remarks>
    public async Task<DashboardStatsDto> GetManagerDashboardStatsAsync(Guid managerId, CancellationToken ct = default)
    {
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.ManagerId == managerId, ct);
        if (branch == null) return new DashboardStatsDto();

        var services = await db.BranchServices.AsNoTracking().Where(s => s.BranchId == branch.BranchId).ToListAsync(ct);

        var completedStatuses = new byte[] { BookingStatus.Completed, BookingStatus.Closed };
        var branchRevenue = await db.Bookings.AsNoTracking()
            .Where(b => b.BranchId == branch.BranchId && completedStatuses.Contains(b.BookingStatus))
            .SumAsync(b => b.BookingFinalAmount, ct);

        var activeStatuses = new byte[] { BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InProgress };
        var activeOrders = await db.Bookings.AsNoTracking()
            .CountAsync(b => b.BranchId == branch.BranchId && activeStatuses.Contains(b.BookingStatus), ct);

        var tenWeeksAgo = DateTime.UtcNow.Date.AddDays(-70);
        var recentBookings = await db.Bookings.AsNoTracking()
            .Where(b => b.BranchId == branch.BranchId && completedStatuses.Contains(b.BookingStatus) && b.CreatedAtUtc >= tenWeeksAgo)
            .Select(b => new { b.CreatedAtUtc, b.BookingFinalAmount })
            .ToListAsync(ct);

        var weeklyRevenues = new decimal[10];
        var now = DateTime.UtcNow.Date;

        foreach (var b in recentBookings)
        {
            var diff = (now - b.CreatedAtUtc.Date).Days;
            if (diff >= 0 && diff < 70)
            {
                var weekIndex = 9 - (diff / 7);
                weeklyRevenues[weekIndex] += b.BookingFinalAmount;
            }
        }

        var maxRev = weeklyRevenues.Length > 0 ? weeklyRevenues.Max() : 0;
        var revenueWeeks = weeklyRevenues.Select(r => maxRev > 0 ? (int)(r * 100 / maxRev) : 0).ToList();

        return new DashboardStatsDto
        {
            TotalServices = services.Count,
            ActiveServices = services.Count(s => s.IsActive),
            BranchRevenue = branchRevenue,
            ActiveOrders = activeOrders,
            RevenueWeeks = revenueWeeks
        };
    }

    /// <summary>Số lượng + tổng giá trị booking Online/WalkIn theo ngày/tuần/tháng — toàn hệ thống.</summary>
    /// <remarks>Gọi: helper BuildStatsAsync → IBookingRepository.GetForStatsAsync (không giới hạn branch trừ khi query.BranchId chỉ định).</remarks>
    public Task<List<BookingStatsByPeriodDto>> GetAdminBookingStatsAsync(
        BookingStatsQuery query, CancellationToken ct = default)
        => BuildStatsAsync(query.BranchId, query, ct); // Admin: không giới hạn branch trừ khi query.BranchId chỉ định

    /// <summary>Số lượng + tổng giá trị booking Online/WalkIn theo ngày/tuần/tháng — chi nhánh của Manager (ép branchId, không tin query từ client).</summary>
    /// <remarks>Gọi: db.Branches.FirstOrDefaultAsync(ManagerId) → helper BuildStatsAsync (→ IBookingRepository.GetForStatsAsync).</remarks>
    public async Task<List<BookingStatsByPeriodDto>> GetManagerBookingStatsAsync(
        Guid managerId, BookingStatsQuery query, CancellationToken ct = default)
    {
        var branch = await db.Branches.AsNoTracking().FirstOrDefaultAsync(b => b.ManagerId == managerId, ct);
        if (branch == null) return [];
        // Luôn ép branch của Manager, KHÔNG dùng query.BranchId — nếu không, Manager có thể tự truyền
        // ?branchId=... trên URL để xem thống kê của chi nhánh khác (lộ dữ liệu chéo chi nhánh).
        return await BuildStatsAsync(branch.BranchId, query, ct);
    }

    /// <remarks>Gọi: IBookingRepository.GetForStatsAsync.</remarks>
    private async Task<List<BookingStatsByPeriodDto>> BuildStatsAsync(
        Guid? effectiveBranchId, BookingStatsQuery query, CancellationToken ct)
    {
        if (query.GroupBy is not (ReportPeriod.Day or ReportPeriod.Week or ReportPeriod.Month))
            throw AppException.BadRequest(ValidationMessage.Report.InvalidGroupBy);

        var bookings = await bookingRepo.GetForStatsAsync(
            effectiveBranchId, query.FromDate, query.ToDate, ct);

        var grouped = bookings
            .Select(b => new
            {
                b.BookingType,
                b.BookingFinalAmount,
                LocalDate = DateOnly.FromDateTime(b.CreatedAtUtc.AddHours(VietnamTimeHelper.UtcOffsetHours)),
            })
            .GroupBy(x => GetPeriodStart(x.LocalDate, query.GroupBy))
            .OrderBy(g => g.Key)
            .Select(g => new BookingStatsByPeriodDto
            {
                PeriodStart = g.Key,
                PeriodLabel = query.GroupBy switch
                {
                    ReportPeriod.Month => g.Key.ToString("MM/yyyy"),
                    ReportPeriod.Day   => g.Key.ToString("dd/MM/yyyy"),
                    _                  => $"{g.Key:dd/MM} - {g.Key.AddDays(6):dd/MM/yyyy}",
                },
                OnlineCount  = g.Count(x => x.BookingType == BookingType.Online),
                OnlineAmount = g.Where(x => x.BookingType == BookingType.Online).Sum(x => x.BookingFinalAmount),
                WalkInCount  = g.Count(x => x.BookingType == BookingType.WalkIn),
                WalkInAmount = g.Where(x => x.BookingType == BookingType.WalkIn).Sum(x => x.BookingFinalAmount),
            })
            .ToList();

        foreach (var row in grouped)
        {
            row.TotalCount  = row.OnlineCount + row.WalkInCount;
            row.TotalAmount = row.OnlineAmount + row.WalkInAmount;
        }
        return grouped;
    }

    // Gộp trong bộ nhớ (không GroupBy trên IQueryable) — dịch GroupBy theo tuần/tháng sang SQL
    // dễ lỗi/không nhất quán giữa provider; quy mô dữ liệu dự án đủ nhỏ để an toàn khi làm ở client.
    private static DateOnly GetPeriodStart(DateOnly localDate, byte groupBy)
    {
        if (groupBy == ReportPeriod.Day)
            return localDate;

        if (groupBy == ReportPeriod.Month)
            return new DateOnly(localDate.Year, localDate.Month, 1);

        int diff = ((int)localDate.DayOfWeek + 6) % 7; // số ngày từ Thứ 2 gần nhất
        return localDate.AddDays(-diff);
    }
}
