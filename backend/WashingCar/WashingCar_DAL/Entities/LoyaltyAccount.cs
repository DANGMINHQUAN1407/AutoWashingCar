using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class LoyaltyAccount
{
    public Guid LoyaltyAccountId { get; set; }

    public Guid UserId { get; set; }

    public Guid TierId { get; set; }

    public int CurrentPoints { get; set; }

    public int LifetimePoints { get; set; }

    public DateTime UpdatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<LoyaltyLedgerEntry> LoyaltyLedgerEntries { get; set; } = new List<LoyaltyLedgerEntry>();

    public virtual Tier Tier { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
