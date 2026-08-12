using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Tier
{
    public Guid TierId { get; set; }

    public string TierName { get; set; } = null!;

    public int MinPoints { get; set; }

    public decimal EarnRate { get; set; }

    public string? Benefits { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual ICollection<LoyaltyAccount> LoyaltyAccounts { get; set; } = new List<LoyaltyAccount>();

    public virtual ICollection<TierBenefit> TierBenefits { get; set; } = new List<TierBenefit>();

    public virtual ICollection<TierVoucher> TierVouchers { get; set; } = new List<TierVoucher>();
}
