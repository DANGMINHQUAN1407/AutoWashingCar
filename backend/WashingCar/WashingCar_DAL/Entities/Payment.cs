using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Payment
{
    public Guid PaymentId { get; set; }

    public Guid BookingId { get; set; }

    public byte PaymentType { get; set; }

    public byte PaymentMethod { get; set; }

    public byte PaymentStatus { get; set; }

    public decimal Amount { get; set; }

    public string? TransactionCode { get; set; }

    public DateTime? PaidAtUtc { get; set; }

    public Guid? OriginalPaymentId { get; set; }

    public string? RefundReason { get; set; }

    public Guid? RefundedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual Booking Booking { get; set; } = null!;

    public virtual ICollection<Payment> InverseOriginalPayment { get; set; } = new List<Payment>();

    public virtual Payment? OriginalPayment { get; set; }

    public virtual User? RefundedByUser { get; set; }

    public virtual ICollection<TenderAllocation> TenderAllocations { get; set; } = new List<TenderAllocation>();
}
