namespace WashingCar_Domain.DTOs.Report;

public class PaymentReconciliationDto
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? BranchId { get; set; }
    public int CompletedPaymentCount { get; set; }
    public int CompletedRefundCount { get; set; }
    public decimal GrossCollected { get; set; }
    public decimal RefundedAmount { get; set; }
    public decimal NetRevenue { get; set; }
}
