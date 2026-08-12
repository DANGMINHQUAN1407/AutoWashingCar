using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Payment;

public class PaymentQuery : PaginationQuery
{
    public Guid?     BookingId { get; set; }  // lọc theo booking
    public byte?     Status    { get; set; }  // PaymentStatus
    public byte?     Type      { get; set; }  // PaymentType
    public byte?     Method    { get; set; }  // PaymentMethod
    public DateOnly? FromDate  { get; set; }  // theo CreatedAtUtc
    public DateOnly? ToDate    { get; set; }
}
