namespace WashingCar_Domain.DTOs.Report;

public class DashboardStatsDto
{
    public int TotalBranches { get; set; }
    public int ActiveBranches { get; set; }
    public int TotalStaff { get; set; }
    public decimal SystemRevenue { get; set; }
    public decimal BranchRevenue { get; set; }
    public int NetworkHealth { get; set; }
    public int MonthlyWashes { get; set; }
    public int TotalServices { get; set; }
    public int ActiveServices { get; set; }
    public int ActiveOrders { get; set; }
    public List<int> RevenueWeeks { get; set; } = new();
}
