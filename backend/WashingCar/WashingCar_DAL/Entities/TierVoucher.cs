using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class TierVoucher
{
    public Guid TierVoucherId { get; set; }

    public Guid TierId { get; set; }

    public Guid VoucherId { get; set; }

    public int RequiredPoints { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual Tier Tier { get; set; } = null!;

    public virtual Voucher Voucher { get; set; } = null!;
}
