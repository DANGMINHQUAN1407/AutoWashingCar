namespace WashingCar_Domain.DTOs.Report;

public class BookingStatsByPeriodDto
{
    public string   PeriodLabel  { get; set; } = null!; // vd "22/07 - 28/07/2026" hoặc "07/2026"
    public DateOnly PeriodStart  { get; set; }
    public int      OnlineCount  { get; set; }
    public decimal  OnlineAmount { get; set; }
    public int      WalkInCount  { get; set; }
    public decimal  WalkInAmount { get; set; }
    public int      TotalCount   { get; set; }
    public decimal  TotalAmount  { get; set; }
}
