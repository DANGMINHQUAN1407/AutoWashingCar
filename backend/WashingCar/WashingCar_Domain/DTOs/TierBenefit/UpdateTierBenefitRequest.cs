using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.TierBenefit;

public class UpdateTierBenefitRequest
{
    [Required]
    public byte BenefitType { get; set; }

    [Required, MaxLength(200)]
    public string BenefitValue { get; set; } = null!;

    [MaxLength(500)]
    public string? Description { get; set; }
}
