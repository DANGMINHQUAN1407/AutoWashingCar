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
        var systemLedger = await GetRevenueSummaryAsync(branchId: null, ct);
        var networkHealth = branches.Count > 0
            ? (int)Math.Round((double)activeBranches / branches.Count * 100)
            : 0;
        var revenueWeeks = await GetWeeklyNetRevenuePercentagesAsync(branchId: null, ct);

        var currentMonthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var monthlyWashes = await db.Bookings.AsNoTracking()
            .CountAsync(b => completedStatuses.Contains(b.BookingStatus) && b.CreatedAtUtc >= currentMonthStart, ct);

        return new DashboardStatsDto
        {
            TotalBranches = branches.Count,
            ActiveBranches = activeBranches,
            TotalStaff = staffCount,
            // SystemRevenue giữ tên cũ nhưng mang nghĩa net revenue từ payment ledger.
            SystemRevenue = systemLedger.NetRevenue,
            GrossCollected = systemLedger.GrossCollected,
            RefundedAmount = systemLedger.RefundedAmount,
            NetRevenue = systemLedger.NetRevenue,
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

        var branchLedger = await GetRevenueSummaryAsync(branch.BranchId, ct);
        var activeStatuses = new byte[] { BookingStatus.Pending, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InProgress };
        var activeOrders = await db.Bookings.AsNoTracking()
            .CountAsync(b => b.BranchId == branch.BranchId && activeStatuses.Contains(b.BookingStatus), ct);
        var revenueWeeks = await GetWeeklyNetRevenuePercentagesAsync(branch.BranchId, ct);

        return new DashboardStatsDto
        {
            TotalServices = services.Count,
            ActiveServices = services.Count(s => s.IsActive),
            // BranchRevenue giữ tên cũ nhưng mang nghĩa net revenue từ payment ledger.
            BranchRevenue = branchLedger.NetRevenue,
            GrossCollected = branchLedger.GrossCollected,
            RefundedAmount = branchLedger.RefundedAmount,
            NetRevenue = branchLedger.NetRevenue,
            ActiveOrders = activeOrders,
            RevenueWeeks = revenueWeeks
        };
    }

    public async Task<PaymentReconciliationDto> GetAdminPaymentReconciliationAsync(
        PaymentReconciliationQuery query, CancellationToken ct = default)
    {
        ValidateDateRange(query.FromDate, query.ToDate);
        return await BuildPaymentReconciliationAsync(query.BranchId, query, ct);
    }

    public async Task<PaymentReconciliationDto> GetManagerPaymentReconciliationAsync(
        Guid managerId, PaymentReconciliationQuery query, CancellationToken ct = default)
    {
        ValidateDateRange(query.FromDate, query.ToDate);
        var branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.ManagerId == managerId, ct);
        if (branch == null)
            return new PaymentReconciliationDto
            {
                FromDate = query.FromDate,
                ToDate = query.ToDate,
            };

        // Không dùng query.BranchId của client; Manager chỉ được xem branch của mình.
        return await BuildPaymentReconciliationAsync(branch.BranchId, query, ct);
    }

    public async Task<StaffOperationalStatsDto> GetStaffOperationalStatsAsync(
        Guid staffId, CancellationToken ct = default)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(VietnamTimeHelper.UtcOffsetHours));
        var todayStartUtc = VietnamTimeHelper.SlotStartToUtc(today, TimeOnly.MinValue);
        var activeStatuses = new byte[]
        {
            BookingStatus.Pending,
            BookingStatus.Confirmed,
            BookingStatus.CheckedIn,
            BookingStatus.InProgress,
        };

        var assignedToday = db.Bookings.AsNoTracking()
            .Where(b => b.AssignedStaffId == staffId
                     && b.SlotInventory.SlotDate == today
                     && b.BookingStatus != BookingStatus.Cancelled
                     && b.BookingStatus != BookingStatus.NoShow);

        return new StaffOperationalStatsDto
        {
            TotalAssignedToday = await assignedToday.CountAsync(ct),
            AssignedActiveBookings = await assignedToday
                .CountAsync(b => activeStatuses.Contains(b.BookingStatus), ct),
            CheckedInBookings = await assignedToday
                .CountAsync(b => b.BookingStatus == BookingStatus.CheckedIn, ct),
            InProgressBookings = await assignedToday
                .CountAsync(b => b.BookingStatus == BookingStatus.InProgress, ct),
            CompletedToday = await db.Bookings.AsNoTracking()
                .CountAsync(b => b.AssignedStaffId == staffId
                              && (b.BookingStatus == BookingStatus.Completed
                               || b.BookingStatus == BookingStatus.Closed)
                              && b.CompletedAtUtc >= todayStartUtc, ct),
        };
    }

    private async Task<PaymentReconciliationDto> BuildPaymentReconciliationAsync(
        Guid? branchId,
        PaymentReconciliationQuery query,
        CancellationToken ct)
    {
        DateTime? fromUtc = query.FromDate.HasValue
            ? VietnamTimeHelper.SlotStartToUtc(query.FromDate.Value, TimeOnly.MinValue)
            : null;
        DateTime? toExclusiveUtc = query.ToDate.HasValue
            ? VietnamTimeHelper.SlotStartToUtc(query.ToDate.Value.AddDays(1), TimeOnly.MinValue)
            : null;

        var payments = db.Payments.AsNoTracking()
            .Where(p => p.PaymentStatus == PaymentStatus.Completed)
            .Where(p => !branchId.HasValue || p.Booking.BranchId == branchId.Value)
            .Where(p => !fromUtc.HasValue || (p.PaidAtUtc ?? p.CreatedAtUtc) >= fromUtc.Value)
            .Where(p => !toExclusiveUtc.HasValue || (p.PaidAtUtc ?? p.CreatedAtUtc) < toExclusiveUtc.Value);

        var rows = await payments
            .Select(p => new { p.PaymentType, p.Amount })
            .ToListAsync(ct);
        var gross = rows
            .Where(p => p.PaymentType != PaymentType.Refund)
            .Sum(p => p.Amount);
        var refunded = rows
            .Where(p => p.PaymentType == PaymentType.Refund)
            .Sum(p => p.Amount);

        return new PaymentReconciliationDto
        {
            FromDate = query.FromDate,
            ToDate = query.ToDate,
            BranchId = branchId,
            CompletedPaymentCount = rows.Count(p => p.PaymentType != PaymentType.Refund),
            CompletedRefundCount = rows.Count(p => p.PaymentType == PaymentType.Refund),
            GrossCollected = gross,
            RefundedAmount = refunded,
            NetRevenue = gross - refunded,
        };
    }

    private async Task<(decimal GrossCollected, decimal RefundedAmount, decimal NetRevenue)> GetRevenueSummaryAsync(
        Guid? branchId, CancellationToken ct)
    {
        var rows = await db.Payments.AsNoTracking()
            .Where(p => p.PaymentStatus == PaymentStatus.Completed)
            .Where(p => !branchId.HasValue || p.Booking.BranchId == branchId.Value)
            .Select(p => new { p.PaymentType, p.Amount })
            .ToListAsync(ct);
        var gross = rows.Where(p => p.PaymentType != PaymentType.Refund).Sum(p => p.Amount);
        var refunded = rows.Where(p => p.PaymentType == PaymentType.Refund).Sum(p => p.Amount);
        return (gross, refunded, gross - refunded);
    }

    private async Task<List<int>> GetWeeklyNetRevenuePercentagesAsync(
        Guid? branchId, CancellationToken ct)
    {
        var cutoffUtc = DateTime.UtcNow.AddDays(-70);
        var rows = await db.Payments.AsNoTracking()
            .Where(p => p.PaymentStatus == PaymentStatus.Completed
                     && (p.PaidAtUtc ?? p.CreatedAtUtc) >= cutoffUtc)
            .Where(p => !branchId.HasValue || p.Booking.BranchId == branchId.Value)
            .Select(p => new
            {
                p.PaymentType,
                p.Amount,
                EventUtc = p.PaidAtUtc ?? p.CreatedAtUtc,
            })
            .ToListAsync(ct);

        var weeklyNet = new decimal[10];
        var todayLocal = DateTime.UtcNow.AddHours(VietnamTimeHelper.UtcOffsetHours).Date;
        foreach (var row in rows)
        {
            var eventLocalDate = row.EventUtc.AddHours(VietnamTimeHelper.UtcOffsetHours).Date;
            var diff = (todayLocal - eventLocalDate).Days;
            if (diff is < 0 or >= 70)
                continue;

            var weekIndex = 9 - (diff / 7);
            weeklyNet[weekIndex] += row.PaymentType == PaymentType.Refund
                ? -row.Amount
                : row.Amount;
        }

        var maxRevenue = weeklyNet.Select(Math.Abs).DefaultIfEmpty(0m).Max();
        return weeklyNet
            .Select(value => maxRevenue > 0
                ? (int)Math.Round(value * 100 / maxRevenue)
                : 0)
            .ToList();
    }

    private static void ValidateDateRange(DateOnly? fromDate, DateOnly? toDate)
    {
        if (fromDate.HasValue && toDate.HasValue && fromDate.Value > toDate.Value)
            throw AppException.BadRequest(ValidationMessage.Report.InvalidDateRange);
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
