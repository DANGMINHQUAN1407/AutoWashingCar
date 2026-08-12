using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using WashingCar_Domain.DTOs.Report;

namespace WashingCar_BLL.Interfaces;

public interface IReportService
{
    Task<DashboardStatsDto> GetAdminDashboardStatsAsync(CancellationToken ct = default);
    Task<DashboardStatsDto> GetManagerDashboardStatsAsync(Guid managerId, CancellationToken ct = default);

    /// <summary>Số lượng + tổng giá trị booking Online/WalkIn theo ngày/tuần/tháng — toàn hệ thống (Admin).</summary>
    Task<List<BookingStatsByPeriodDto>> GetAdminBookingStatsAsync(BookingStatsQuery query, CancellationToken ct = default);

    /// <summary>Số lượng + tổng giá trị booking Online/WalkIn theo ngày/tuần/tháng — chi nhánh của Manager.</summary>
    Task<List<BookingStatsByPeriodDto>> GetManagerBookingStatsAsync(Guid managerId, BookingStatsQuery query, CancellationToken ct = default);
}
