namespace WashingCar_DAL.Entities;

public class TierBenefit
{
    public Guid TierBenefitId { get; set; }

    public Guid TierId { get; set; }

    public byte BenefitType { get; set; }

    public string BenefitValue { get; set; } = null!;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual Tier Tier { get; set; } = null!;
}
