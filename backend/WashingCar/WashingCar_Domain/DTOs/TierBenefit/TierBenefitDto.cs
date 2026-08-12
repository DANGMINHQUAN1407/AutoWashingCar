namespace WashingCar_Domain.DTOs.TierBenefit;

public class TierBenefitDto
{
    public Guid TierBenefitId { get; set; }
    public Guid TierId { get; set; }
    public byte BenefitType { get; set; }
    public string BenefitTypeName { get; set; } = null!;
    public string BenefitValue { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
