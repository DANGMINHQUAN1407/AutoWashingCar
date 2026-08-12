using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class LoyaltyLedgerEntry
{
    public Guid LoyaltyLedgerEntryId { get; set; }

    public Guid LoyaltyAccountId { get; set; }

    public Guid UserId { get; set; }

    public Guid? BookingId { get; set; }

    public byte EntryType { get; set; }

    public int Points { get; set; }

    public int BalanceAfter { get; set; }

    public string? Description { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual Booking? Booking { get; set; }

    public virtual LoyaltyAccount LoyaltyAccount { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
