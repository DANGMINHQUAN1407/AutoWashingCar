namespace WashingCar_Domain.DTOs.Loyalty;

public class LoyaltyLedgerDto
{
    public Guid LoyaltyLedgerEntryId { get; set; }
    public byte EntryType { get; set; }
    public string EntryTypeName { get; set; } = null!;
    public int Points { get; set; }
    public int BalanceAfter { get; set; }
    public string? Description { get; set; }
    public Guid? BookingId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
