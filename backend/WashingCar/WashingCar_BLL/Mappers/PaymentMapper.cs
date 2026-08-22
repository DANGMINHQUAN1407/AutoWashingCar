using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Payment;

namespace WashingCar_BLL.Mappers;

public static class PaymentMapper
{
    public static TenderAllocationDto ToDto(this TenderAllocation t) => new()
    {
        TenderAllocationId = t.TenderAllocationId,
        TenderType         = t.TenderType,
        Amount             = t.Amount,
    };

    public static PaymentDto ToDto(this Payment p) => new()
    {
        PaymentId       = p.PaymentId,
        BookingId       = p.BookingId,
        BookingCode     = p.Booking?.BookingCode,
        PaymentType     = p.PaymentType,
        PaymentMethod   = p.PaymentMethod,
        PaymentStatus   = p.PaymentStatus,
        Amount          = p.Amount,
        TransactionCode   = p.TransactionCode,
        OriginalPaymentId = p.OriginalPaymentId,
        RefundReason      = p.RefundReason,
        RefundedByUserId  = p.RefundedByUserId,
        PaidAtUtc         = p.PaidAtUtc,
        CreatedAtUtc    = p.CreatedAtUtc,
        Tenders         = p.TenderAllocations.Select(t => t.ToDto()).ToList(),
    };

    public static PaymentListItemDto ToListItemDto(this Payment p) => new()
    {
        PaymentId       = p.PaymentId,
        BookingId       = p.BookingId,
        BookingCode     = p.Booking?.BookingCode,
        PaymentType     = p.PaymentType,
        PaymentMethod   = p.PaymentMethod,
        PaymentStatus   = p.PaymentStatus,
        Amount          = p.Amount,
        TransactionCode   = p.TransactionCode,
        OriginalPaymentId = p.OriginalPaymentId,
        RefundReason      = p.RefundReason,
        RefundedByUserId  = p.RefundedByUserId,
        PaidAtUtc         = p.PaidAtUtc,
        CreatedAtUtc    = p.CreatedAtUtc,
    };
}
