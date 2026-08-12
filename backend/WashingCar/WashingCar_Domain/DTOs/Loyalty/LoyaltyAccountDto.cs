namespace WashingCar_Domain.DTOs.Loyalty;

public class LoyaltyAccountDto
{
    public Guid LoyaltyAccountId { get; set; }
    public Guid UserId { get; set; }
    public int CurrentPoints { get; set; }
    public int LifetimePoints { get; set; }
    public TierInfoDto Tier { get; set; } = null!;
    public TierInfoDto? NextTier { get; set; }
    public int? PointsToNextTier { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class TierInfoDto
{
    public Guid TierId { get; set; }
    public string TierName { get; set; } = null!;
    public int MinPoints { get; set; }
    public decimal EarnRate { get; set; }
    public string? Benefits { get; set; }
}
