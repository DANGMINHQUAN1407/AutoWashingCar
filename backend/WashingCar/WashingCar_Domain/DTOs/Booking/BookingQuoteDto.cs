namespace WashingCar_Domain.DTOs.Booking;

public class BookingQuoteDto
{
    public List<BookingLineDto> Lines { get; set; } = new();
    public decimal Subtotal             { get; set; }
    public decimal DiscountAmount       { get; set; }  // = 0 ở v1 (chừa chỗ voucher)
    public decimal FinalAmount          { get; set; }
    public int     TotalDurationMinutes { get; set; }
}
