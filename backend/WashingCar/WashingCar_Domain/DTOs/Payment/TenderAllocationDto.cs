namespace WashingCar_Domain.DTOs.Payment;

public class TenderAllocationDto
{
    public Guid    TenderAllocationId { get; set; }
    public byte    TenderType         { get; set; }
    public decimal Amount             { get; set; }
}
