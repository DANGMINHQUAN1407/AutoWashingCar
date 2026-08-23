namespace WashingCar_Domain.DTOs.Report;

public class PaymentReconciliationQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate { get; set; }
    public Guid? BranchId { get; set; }
}
