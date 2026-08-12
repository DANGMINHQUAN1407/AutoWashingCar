namespace WashingCar_Domain.DTOs.Tier;

public class TierDto
{
    public Guid TierId { get; set; }
    public string TierName { get; set; } = null!;
    public int MinPoints { get; set; }
    public decimal EarnRate { get; set; }
    public string? Benefits { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
