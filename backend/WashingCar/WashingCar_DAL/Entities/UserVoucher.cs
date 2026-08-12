using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class UserVoucher
{
    public Guid UserVoucherId { get; set; }

    public Guid UserId { get; set; }

    public Guid VoucherId { get; set; }

    public int RedeemedPoints { get; set; }

    public byte VoucherStatus { get; set; }

    public DateTime RedeemedAtUtc { get; set; }

    public DateTime? ExpiredAtUtc { get; set; }

    public DateTime? UsedAtUtc { get; set; }

    public virtual Booking? Booking { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual Voucher Voucher { get; set; } = null!;
}
