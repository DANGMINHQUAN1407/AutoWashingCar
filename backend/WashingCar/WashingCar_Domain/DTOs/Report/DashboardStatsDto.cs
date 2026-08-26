namespace WashingCar_Domain.DTOs.Report;

public class DashboardStatsDto
{
    public int TotalBranches { get; set; }
    public int ActiveBranches { get; set; }
    public int TotalStaff { get; set; }
    // Giữ lại hai field cũ để tương thích FE; giá trị hiện tại là NetRevenue.
    public decimal SystemRevenue { get; set; }
    public decimal BranchRevenue { get; set; }
    public decimal GrossCollected { get; set; }
    public decimal RefundedAmount { get; set; }
    public decimal NetRevenue { get; set; }
    public int NetworkHealth { get; set; }
    public int MonthlyWashes { get; set; }
    public int TotalServices { get; set; }
    public int ActiveServices { get; set; }
    public int ActiveOrders { get; set; }
    public int PendingOrders { get; set; }
    public int CancelledOrders { get; set; }
    public List<int> RevenueWeeks { get; set; } = new();
    public List<decimal> RevenueWeeklyAmounts { get; set; } = new();
    public decimal CurrentMonthRevenue { get; set; }

    // KPI fields
    public int TotalCustomers { get; set; }
    public int TotalBookings { get; set; }
    public int LoyaltyMembers { get; set; }
    public int CompletedServices { get; set; }
    public int TotalVehicles { get; set; }
    public int VouchersUsed { get; set; }
    public int PointsRedeemed { get; set; }

    // Channel breakdown & conversion — tính toán thực tế từ DB
    public int OnlinePct { get; set; }
    public int WalkInPct { get; set; }
    public int ConversionRate { get; set; }
}
