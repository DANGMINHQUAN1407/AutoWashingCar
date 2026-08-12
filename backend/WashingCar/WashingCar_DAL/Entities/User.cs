using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class User
{
    public Guid UserId { get; set; }

    public string FullName { get; set; } = null!;

    public string? Email { get; set; }

    public string? PhoneNumber { get; set; }

    public string? PasswordHash { get; set; }

    public string Role { get; set; } = null!;

    public bool IsGuest { get; set; }

    public bool IsActive { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public Guid? DeletedByUserId { get; set; }

    public Guid? BranchId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();

    public virtual ICollection<Booking> BookingCheckedInByUsers { get; set; } = new List<Booking>();

    public virtual ICollection<Booking> BookingAssignedStaffs { get; set; } = new List<Booking>();

    public virtual ICollection<Booking> BookingUsers { get; set; } = new List<Booking>();

    public virtual Branch? Branch { get; set; }

    public virtual User? DeletedByUser { get; set; }

    public virtual ICollection<User> InverseDeletedByUser { get; set; } = new List<User>();

    public virtual LoyaltyAccount? LoyaltyAccount { get; set; }

    public virtual ICollection<LoyaltyLedgerEntry> LoyaltyLedgerEntries { get; set; } = new List<LoyaltyLedgerEntry>();

    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();

    public virtual ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();

    public virtual ICollection<Review> Reviews { get; set; } = new List<Review>();

    public virtual ICollection<Review> ReviewStaffs { get; set; } = new List<Review>();

    public virtual ICollection<UserVoucher> UserVouchers { get; set; } = new List<UserVoucher>();

    public virtual ICollection<Vehicle> VehicleDeletedByUsers { get; set; } = new List<Vehicle>();

    public virtual ICollection<Vehicle> VehicleUsers { get; set; } = new List<Vehicle>();

    public virtual ICollection<Voucher> VoucherApprovedByUsers { get; set; } = new List<Voucher>();

    public virtual ICollection<Voucher> VoucherCreatedByUsers { get; set; } = new List<Voucher>();
}
