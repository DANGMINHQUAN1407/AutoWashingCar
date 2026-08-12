using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Booking
{
    public Guid BookingId { get; set; }

    public Guid UserId { get; set; }

    public Guid VehicleId { get; set; }

    public Guid SlotInventoryId { get; set; }

    public Guid BranchId { get; set; }

    public Guid? UserVoucherId { get; set; }

    public string BookingCode { get; set; } = null!;

    public string CheckInQrCode { get; set; } = null!;

    public byte BookingType { get; set; }

    public byte BookingStatus { get; set; }

    public decimal BookingSubtotal { get; set; }

    public decimal BookingDiscountAmount { get; set; }

    public decimal BookingFinalAmount { get; set; }

    public decimal? DepositAmount { get; set; }

    public int EarnedPoints { get; set; }

    public int RedeemedPoints { get; set; }

    public DateTime? CheckInAtUtc { get; set; }

    public Guid? CheckedInByUserId { get; set; }

    public Guid? AssignedStaffId { get; set; }

    public DateTime? CompletedAtUtc { get; set; }

    public DateTime? AssignedAtUtc { get; set; }

    public DateTime? ReminderSentAtUtc { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual Branch Branch { get; set; } = null!;

    public virtual ICollection<BookingLine> BookingLines { get; set; } = new List<BookingLine>();

    public virtual User? CheckedInByUser { get; set; }

    public virtual User? AssignedStaff { get; set; }

    public virtual ICollection<LoyaltyLedgerEntry> LoyaltyLedgerEntries { get; set; } = new List<LoyaltyLedgerEntry>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual SlotInventory SlotInventory { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual UserVoucher? UserVoucher { get; set; }

    public virtual Vehicle Vehicle { get; set; } = null!;
}
