using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Voucher
{
    public Guid VoucherId { get; set; }

    public string VoucherCode { get; set; } = null!;

    public byte VoucherType { get; set; }

    public byte DiscountType { get; set; }

    public decimal DiscountValue { get; set; }

    public decimal? MinOrderAmount { get; set; }

    public decimal? MaxDiscountAmount { get; set; }

    public int Quantity { get; set; }

    public int UsedCount { get; set; }

    public DateTime StartUtc { get; set; }

    public DateTime EndUtc { get; set; }

    public int RequiredPoints { get; set; }

    public bool IsActive { get; set; }

    public byte ApprovalStatus { get; set; }

    public Guid? BranchId { get; set; }

    public Guid CreatedByUserId { get; set; }

    public Guid? ApprovedByUserId { get; set; }

    public DateTime? ApprovedAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual Branch? Branch { get; set; }

    public virtual User? ApprovedByUser { get; set; }

    public virtual User CreatedByUser { get; set; } = null!;

    public virtual ICollection<TierVoucher> TierVouchers { get; set; } = new List<TierVoucher>();

    public virtual ICollection<UserVoucher> UserVouchers { get; set; } = new List<UserVoucher>();
}
