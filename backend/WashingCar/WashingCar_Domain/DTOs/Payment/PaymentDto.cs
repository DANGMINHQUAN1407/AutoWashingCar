namespace WashingCar_Domain.DTOs.Payment;

public class PaymentDto
{
    public Guid    PaymentId       { get; set; }
    public Guid    BookingId       { get; set; }
    public string? BookingCode     { get; set; }  // điền khi load kèm Booking
    public byte    PaymentType     { get; set; }
    public byte    PaymentMethod   { get; set; }
    public byte    PaymentStatus   { get; set; }
    public decimal Amount          { get; set; }
    public string? TransactionCode { get; set; }

    public Guid? OriginalPaymentId { get; set; }
    public string? RefundReason { get; set; }
    public Guid? RefundedByUserId { get; set; }

    public DateTime? PaidAtUtc    { get; set; }
    public DateTime  CreatedAtUtc { get; set; }

    public List<TenderAllocationDto> Tenders { get; set; } = new();
}
