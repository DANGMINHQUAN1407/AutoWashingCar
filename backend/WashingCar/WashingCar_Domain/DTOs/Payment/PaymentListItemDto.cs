namespace WashingCar_Domain.DTOs.Payment;

public class PaymentListItemDto
{
    public Guid    PaymentId       { get; set; }
    public Guid    BookingId       { get; set; }
    public string? BookingCode     { get; set; }
    public byte    PaymentType     { get; set; }
    public byte    PaymentMethod   { get; set; }
    public byte    PaymentStatus   { get; set; }
    public decimal Amount          { get; set; }
    public string? TransactionCode { get; set; }
    public DateTime? PaidAtUtc     { get; set; }
    public DateTime  CreatedAtUtc  { get; set; }
}
