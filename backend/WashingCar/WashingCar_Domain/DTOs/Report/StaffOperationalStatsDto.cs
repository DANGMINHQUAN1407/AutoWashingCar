namespace WashingCar_Domain.DTOs.Report;

public class StaffOperationalStatsDto
{
    public int AssignedActiveBookings { get; set; }
    public int CheckedInBookings { get; set; }
    public int InProgressBookings { get; set; }
    public int CompletedToday { get; set; }
    public int TotalAssignedToday { get; set; }
}
