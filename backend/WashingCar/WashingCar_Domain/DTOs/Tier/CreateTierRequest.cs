using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Tier;

public class CreateTierRequest
{
    [Required, MaxLength(100)]
    public string TierName { get; set; } = null!;

    [Range(0, int.MaxValue)]
    public int MinPoints { get; set; }

    [Range(0.01, 99.99)]
    public decimal EarnRate { get; set; }

    [MaxLength(500)]
    public string? Benefits { get; set; }
}
