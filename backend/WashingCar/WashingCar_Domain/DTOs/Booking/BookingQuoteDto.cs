namespace WashingCar_Domain.DTOs.Booking;

public class BookingQuoteDto
{
    public List<BookingLineDto> Lines { get; set; } = new();
    public decimal ServiceSubtotal      { get; set; }
    public string? VehicleCondition     { get; set; }
    public decimal VehicleSurchargeRate { get; set; }
    public decimal VehicleSurchargeAmount { get; set; }
    public decimal Subtotal             { get; set; }
    public decimal DiscountAmount       { get; set; }
    public decimal FinalAmount          { get; set; }
    public int     TotalDurationMinutes { get; set; }
}
