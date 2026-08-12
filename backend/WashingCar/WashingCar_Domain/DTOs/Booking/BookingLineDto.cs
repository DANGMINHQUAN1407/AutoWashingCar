namespace WashingCar_Domain.DTOs.Booking;

public class BookingLineDto
{
    public Guid    BookingLineId        { get; set; }
    public Guid    ServiceCatalogItemId { get; set; }
    public string  ServiceName          { get; set; } = null!;
    public decimal UnitPrice            { get; set; }
    public short   DurationMinutes      { get; set; }
    public short   Quantity             { get; set; }
    public decimal LineTotal            { get; set; }
}
