using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using WashingCar_Common.Enum;
using WashingCar_DAL.Entities;

namespace WashingCar_DAL.Data;

public partial class WashingCarDbContext : DbContext
{
    public WashingCarDbContext()
    {
    }

    public WashingCarDbContext(DbContextOptions<WashingCarDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<AuditLog> AuditLogs { get; set; }

    public virtual DbSet<Branch> Branches { get; set; }

    public virtual DbSet<BranchService> BranchServices { get; set; }

    public virtual DbSet<Booking> Bookings { get; set; }

    public virtual DbSet<BookingLine> BookingLines { get; set; }

    public virtual DbSet<LoyaltyAccount> LoyaltyAccounts { get; set; }

    public virtual DbSet<LoyaltyLedgerEntry> LoyaltyLedgerEntries { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<RefreshToken> RefreshTokens { get; set; }

    public virtual DbSet<Review> Reviews { get; set; }

    public virtual DbSet<ServiceCatalogItem> ServiceCatalogItems { get; set; }

    public virtual DbSet<SlotInventory> SlotInventories { get; set; }

    public virtual DbSet<TenderAllocation> TenderAllocations { get; set; }

    public virtual DbSet<Tier> Tiers { get; set; }

    public virtual DbSet<TierBenefit> TierBenefits { get; set; }

    public virtual DbSet<TierVoucher> TierVouchers { get; set; }

    public virtual DbSet<User> Users { get; set; }

    public virtual DbSet<UserVoucher> UserVouchers { get; set; }

    public virtual DbSet<Vehicle> Vehicles { get; set; }

    public virtual DbSet<VehicleImage> VehicleImages { get; set; }

    public virtual DbSet<Voucher> Vouchers { get; set; }

    private string GetConnectionString()
    {
        IConfiguration config = new ConfigurationBuilder()
             .SetBasePath(AppContext.BaseDirectory)
                    .AddJsonFile("appsettings.json", true, true)
                    .Build();
        var strConn = config["ConnectionStrings:DefaultConnection"];

        return strConn!;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseSqlServer(GetConnectionString());
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Branch>(entity =>
        {
            entity.ToTable("Branch");

            entity.HasIndex(e => e.BranchCode, "UQ_Branch_Code").IsUnique();

            entity.Property(e => e.BranchId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.BranchCode)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Name).HasMaxLength(200);
            entity.Property(e => e.Address).HasMaxLength(500);
            entity.Property(e => e.City).HasMaxLength(100);
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.Latitude).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.Longitude).HasColumnType("decimal(9, 6)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.UpdatedAtUtc).HasPrecision(3);

            entity.HasOne(d => d.Manager)
                .WithMany()
                .HasForeignKey(d => d.ManagerId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_Branch_Manager");
        });

        modelBuilder.Entity<BranchService>(entity =>
        {
            entity.ToTable("BranchService");

            entity.HasKey(e => new { e.BranchId, e.ServiceCatalogItemId });

            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.AddedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Branch)
                .WithMany(b => b.BranchServices)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_BranchService_Branch");

            entity.HasOne(d => d.ServiceCatalogItem)
                .WithMany(s => s.BranchServices)
                .HasForeignKey(d => d.ServiceCatalogItemId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_BranchService_Service");
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.ToTable("AuditLog");

            entity.HasIndex(e => e.CreatedAtUtc, "IX_AuditLog_CreatedAtUtc").IsDescending();

            entity.HasIndex(e => new { e.TableName, e.RecordId }, "IX_AuditLog_Table_Record");

            entity.HasIndex(e => e.UserId, "IX_AuditLog_UserId").HasFilter("([UserId] IS NOT NULL)");

            entity.Property(e => e.AuditLogId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.Action).HasMaxLength(200);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.TableName).HasMaxLength(200);

            entity.HasOne(d => d.User).WithMany(p => p.AuditLogs)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_AuditLog_User");
        });

        modelBuilder.Entity<Booking>(entity =>
        {
            entity.ToTable("Booking");

            entity.HasIndex(e => e.BranchId, "IX_Booking_BranchId");

            entity.HasIndex(e => e.CheckedInByUserId, "IX_Booking_CheckedInByUserId").HasFilter("([CheckedInByUserId] IS NOT NULL)");

            entity.HasIndex(e => e.AssignedStaffId, "IX_Booking_AssignedStaffId").HasFilter("([AssignedStaffId] IS NOT NULL)");

            entity.HasIndex(e => e.SlotInventoryId, "IX_Booking_SlotInventoryId");

            entity.HasIndex(e => new { e.BookingStatus, e.CreatedAtUtc }, "IX_Booking_Status_CreatedAt").IsDescending(false, true);

            entity.HasIndex(e => e.UserId, "IX_Booking_UserId");

            entity.HasIndex(e => e.VehicleId, "IX_Booking_VehicleId");

            entity.HasIndex(e => e.BookingCode, "UQ_Booking_Code").IsUnique();

            entity.HasIndex(e => e.CheckInQrCode, "UQ_Booking_QrCode").IsUnique();

            entity.HasIndex(e => e.UserVoucherId, "UX_Booking_UserVoucherId")
                .IsUnique()
                .HasFilter("([UserVoucherId] IS NOT NULL)");

            entity.Property(e => e.BookingId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.BookingCode)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.BookingDiscountAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.BookingFinalAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.BookingSubtotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.VehicleConditionAtBooking)
                .HasDefaultValue((byte)VehicleCondition.Standard);
            entity.Property(e => e.VehicleSurchargeRate)
                .HasColumnType("decimal(9, 4)")
                .HasDefaultValue(0m);
            entity.Property(e => e.VehicleSurchargeAmount)
                .HasColumnType("decimal(18, 2)")
                .HasDefaultValue(0m);
            entity.Property(e => e.CheckInAtUtc).HasPrecision(3);
            entity.Property(e => e.CheckInQrCode).HasMaxLength(500);
            entity.Property(e => e.CompletedAtUtc).HasPrecision(3);
            entity.Property(e => e.AssignedAtUtc).HasPrecision(3);
            entity.Property(e => e.ReminderSentAtUtc).HasPrecision(3);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DepositAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();

            entity.HasOne(d => d.Branch).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_Booking_Branch");

            entity.HasOne(d => d.CheckedInByUser).WithMany(p => p.BookingCheckedInByUsers)
                .HasForeignKey(d => d.CheckedInByUserId)
                .HasConstraintName("FK_Booking_CheckedInBy");

            entity.HasOne(d => d.AssignedStaff).WithMany(p => p.BookingAssignedStaffs)
                .HasForeignKey(d => d.AssignedStaffId)
                .HasConstraintName("FK_Booking_AssignedStaff");

            entity.HasOne(d => d.SlotInventory).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.SlotInventoryId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Booking_Slot");

            entity.HasOne(d => d.User).WithMany(p => p.BookingUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Booking_User");

            entity.HasOne(d => d.UserVoucher).WithOne(p => p.Booking)
                .HasForeignKey<Booking>(d => d.UserVoucherId)
                .HasConstraintName("FK_Booking_UserVoucher");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.Bookings)
                .HasForeignKey(d => d.VehicleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Booking_Vehicle");
        });

        modelBuilder.Entity<BookingLine>(entity =>
        {
            entity.ToTable("BookingLine");

            entity.HasIndex(e => e.BookingId, "IX_BookingLine_BookingId");

            entity.HasIndex(e => e.ServiceCatalogItemId, "IX_BookingLine_ServiceCatalogItemId");

            entity.Property(e => e.BookingLineId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.LineTotal).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.ServiceName).HasMaxLength(200);
            entity.Property(e => e.UnitPrice).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Booking).WithMany(p => p.BookingLines)
                .HasForeignKey(d => d.BookingId)
                .HasConstraintName("FK_BookingLine_Booking");

            entity.HasOne(d => d.ServiceCatalogItem).WithMany(p => p.BookingLines)
                .HasForeignKey(d => d.ServiceCatalogItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_BookingLine_Service");
        });

        modelBuilder.Entity<LoyaltyAccount>(entity =>
        {
            entity.ToTable("LoyaltyAccount");

            entity.HasIndex(e => e.TierId, "IX_LoyaltyAccount_TierId");

            entity.HasIndex(e => e.UserId, "UQ_LoyaltyAccount_User").IsUnique();

            entity.Property(e => e.LoyaltyAccountId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Tier).WithMany(p => p.LoyaltyAccounts)
                .HasForeignKey(d => d.TierId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LoyaltyAccount_Tier");

            entity.HasOne(d => d.User).WithOne(p => p.LoyaltyAccount)
                .HasForeignKey<LoyaltyAccount>(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LoyaltyAccount_User");
        });

        modelBuilder.Entity<LoyaltyLedgerEntry>(entity =>
        {
            entity.ToTable("LoyaltyLedgerEntry", tb => tb.HasTrigger("trg_LLE_AfterInsert_RecomputeTier"));

            entity.HasIndex(e => e.BookingId, "IX_LLE_BookingId").HasFilter("([BookingId] IS NOT NULL)");

            entity.HasIndex(e => new { e.LoyaltyAccountId, e.CreatedAtUtc }, "IX_LLE_LoyaltyAccount_Created").IsDescending(false, true);

            entity.HasIndex(e => e.UserId, "IX_LLE_UserId");

            entity.Property(e => e.LoyaltyLedgerEntryId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(500);

            entity.HasOne(d => d.Booking).WithMany(p => p.LoyaltyLedgerEntries)
                .HasForeignKey(d => d.BookingId)
                .HasConstraintName("FK_LLE_Booking");

            entity.HasOne(d => d.LoyaltyAccount).WithMany(p => p.LoyaltyLedgerEntries)
                .HasForeignKey(d => d.LoyaltyAccountId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LLE_LoyaltyAccount");

            entity.HasOne(d => d.User).WithMany(p => p.LoyaltyLedgerEntries)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_LLE_User");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.ToTable("Payment");

            entity.HasIndex(e => e.BookingId, "IX_Payment_BookingId");

            entity.HasIndex(e => e.OriginalPaymentId, "IX_Payment_OriginalPaymentId").HasFilter("([OriginalPaymentId] IS NOT NULL)");

            entity.HasIndex(e => new { e.PaymentStatus, e.CreatedAtUtc }, "IX_Payment_Status_CreatedAt").IsDescending(false, true);

            entity.Property(e => e.PaymentId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.PaidAtUtc).HasPrecision(3);
            entity.Property(e => e.RefundReason).HasMaxLength(500);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.TransactionCode)
                .HasMaxLength(100)
                .IsUnicode(false);

            entity.HasOne(d => d.Booking).WithMany(p => p.Payments)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Payment_Booking");

            entity.HasOne(d => d.OriginalPayment).WithMany(p => p.InverseOriginalPayment)
                .HasForeignKey(d => d.OriginalPaymentId)
                .HasConstraintName("FK_Payment_Original");

            entity.HasOne(d => d.RefundedByUser).WithMany(p => p.Payments)
                .HasForeignKey(d => d.RefundedByUserId)
                .HasConstraintName("FK_Payment_RefundedBy");
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("RefreshToken");

            entity.HasIndex(e => e.UserId, "IX_RefreshToken_UserId");

            entity.HasIndex(e => e.Token, "UQ_RefreshToken_Token").IsUnique();

            entity.Property(e => e.RefreshTokenId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.ExpiresAtUtc).HasPrecision(3);
            entity.Property(e => e.RevokedAtUtc).HasPrecision(3);
            entity.Property(e => e.Token).HasMaxLength(500);

            entity.HasOne(d => d.User).WithMany(p => p.RefreshTokens)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("FK_RefreshToken_User");
        });

        modelBuilder.Entity<Review>(entity =>
        {
            entity.ToTable("Review");

            entity.HasIndex(e => e.UserId, "IX_Review_UserId");

            entity.HasIndex(e => e.StaffId, "IX_Review_StaffId").HasFilter("([StaffId] IS NOT NULL)");

            entity.HasIndex(e => new { e.BookingId, e.ReviewType }, "UQ_Review_Booking_Type")
                .IsUnique();

            entity.Property(e => e.ReviewId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.Comment).HasMaxLength(1000);
            entity.Property(e => e.ReviewType).HasColumnName("ReviewType").HasDefaultValue(1);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Booking).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.BookingId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Review_Booking");

            entity.HasOne(d => d.User).WithMany(p => p.Reviews)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Review_User");

            entity.HasOne(d => d.Staff).WithMany(p => p.ReviewStaffs)
                .HasForeignKey(d => d.StaffId)
                .HasConstraintName("FK_Review_Staff");
        });

        modelBuilder.Entity<ServiceCatalogItem>(entity =>
        {
            entity.ToTable("ServiceCatalogItem");

            entity.Property(e => e.ServiceCatalogItemId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.BasePrice).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.ServiceName).HasMaxLength(200);
            entity.Property(e => e.ServicePackageType)
                .HasColumnType("tinyint")
                .HasDefaultValue((byte)ServicePackageType.Standard);
            entity.ToTable(t => t.HasCheckConstraint(
                "CK_ServiceCatalogItem_ServicePackageType",
                "[ServicePackageType] IN (1, 2, 3)"));
        });

        modelBuilder.Entity<SlotInventory>(entity =>
        {
            entity.ToTable("SlotInventory");

            entity.HasIndex(e => e.BranchId, "IX_SlotInventory_BranchId");

            entity.HasIndex(e => e.SlotDate, "IX_SlotInventory_SlotDate");

            entity.HasIndex(e => new { e.BranchId, e.SlotDate, e.SlotStartTime }, "UQ_SlotInventory_Branch_DateTime").IsUnique();

            entity.Property(e => e.SlotInventoryId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();

            entity.HasOne(d => d.Branch).WithMany(p => p.SlotInventories)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("FK_SlotInventory_Branch");
        });

        modelBuilder.Entity<TenderAllocation>(entity =>
        {
            entity.ToTable("TenderAllocation");

            entity.HasIndex(e => e.PaymentId, "IX_TenderAllocation_PaymentId");

            entity.Property(e => e.TenderAllocationId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.Amount).HasColumnType("decimal(18, 2)");

            entity.HasOne(d => d.Payment).WithMany(p => p.TenderAllocations)
                .HasForeignKey(d => d.PaymentId)
                .HasConstraintName("FK_TA_Payment");
        });

        modelBuilder.Entity<Tier>(entity =>
        {
            entity.ToTable("Tier");

            entity.HasIndex(e => e.MinPoints, "UQ_Tier_MinPoints").IsUnique();

            entity.HasIndex(e => e.TierName, "UQ_Tier_TierName").IsUnique();

            entity.Property(e => e.TierId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.Benefits).HasMaxLength(500);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.EarnRate).HasColumnType("decimal(5, 2)");
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.TierName).HasMaxLength(100);
        });

        modelBuilder.Entity<TierBenefit>(entity =>
        {
            entity.ToTable("TierBenefit");

            entity.HasIndex(e => new { e.TierId, e.BenefitType }, "UQ_TierBenefit_Tier_Type").IsUnique();

            entity.Property(e => e.TierBenefitId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.BenefitValue).HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Tier).WithMany(p => p.TierBenefits)
                .HasForeignKey(d => d.TierId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_TierBenefit_Tier");
        });

        modelBuilder.Entity<TierVoucher>(entity =>
        {
            entity.ToTable("TierVoucher");

            entity.HasIndex(e => e.VoucherId, "IX_TierVoucher_VoucherId");

            entity.HasIndex(e => new { e.TierId, e.VoucherId }, "UQ_TierVoucher_Pair").IsUnique();

            entity.Property(e => e.TierVoucherId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Tier).WithMany(p => p.TierVouchers)
                .HasForeignKey(d => d.TierId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TierVoucher_Tier");

            entity.HasOne(d => d.Voucher).WithMany(p => p.TierVouchers)
                .HasForeignKey(d => d.VoucherId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_TierVoucher_Voucher");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("User");

            entity.HasIndex(e => e.PhoneNumber, "UQ_User_PhoneNumber")
                  .IsUnique()
                  .HasFilter("[PhoneNumber] IS NOT NULL");

            entity.HasIndex(e => e.Email, "UX_User_Email")
                .IsUnique()
                .HasFilter("([Email] IS NOT NULL AND [IsDeleted]=(0))");

            entity.Property(e => e.UserId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DeletedAtUtc).HasPrecision(3);
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .IsUnicode(false);
            entity.Property(e => e.FullName).HasMaxLength(200);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.PasswordHash).HasMaxLength(500);
            entity.Property(e => e.PhoneNumber)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.Role)
                .HasMaxLength(50)
                .IsUnicode(false);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.UpdatedAtUtc).HasPrecision(3);

            entity.HasIndex(e => e.BranchId, "IX_User_BranchId").HasFilter("([BranchId] IS NOT NULL)");

            entity.HasOne(d => d.Branch).WithMany(p => p.Staff)
                .HasForeignKey(d => d.BranchId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("FK_User_Branch");

            entity.HasOne(d => d.DeletedByUser).WithMany(p => p.InverseDeletedByUser)
                .HasForeignKey(d => d.DeletedByUserId)
                .HasConstraintName("FK_User_DeletedBy");
        });

        modelBuilder.Entity<UserVoucher>(entity =>
        {
            entity.ToTable("UserVoucher");

            entity.HasIndex(e => new { e.UserId, e.VoucherStatus }, "IX_UserVoucher_UserId_Status");

            entity.HasIndex(e => e.VoucherId, "IX_UserVoucher_VoucherId");

            entity.Property(e => e.UserVoucherId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.ExpiredAtUtc).HasPrecision(3);
            entity.Property(e => e.RedeemedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.UsedAtUtc).HasPrecision(3);
            entity.Property(e => e.VoucherStatus).HasDefaultValue((byte)1);

            entity.HasOne(d => d.User).WithMany(p => p.UserVouchers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserVoucher_User");

            entity.HasOne(d => d.Voucher).WithMany(p => p.UserVouchers)
                .HasForeignKey(d => d.VoucherId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_UserVoucher_Voucher");
        });

        modelBuilder.Entity<Vehicle>(entity =>
        {
            entity.ToTable("Vehicle");

            entity.HasIndex(e => e.UserId, "IX_Vehicle_UserId");

            entity.HasIndex(e => e.LicensePlate, "UX_Vehicle_LicensePlate")
                .IsUnique()
                .HasFilter("([IsDeleted]=(0))");

            entity.Property(e => e.VehicleId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.Brand).HasMaxLength(100);
            entity.Property(e => e.Model).HasMaxLength(100);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DeletedAtUtc).HasPrecision(3);
            entity.Property(e => e.LicensePlate)
                .HasMaxLength(20)
                .IsUnicode(false);
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();

            entity.HasOne(d => d.DeletedByUser).WithMany(p => p.VehicleDeletedByUsers)
                .HasForeignKey(d => d.DeletedByUserId)
                .HasConstraintName("FK_Vehicle_DeletedBy");

            entity.HasOne(d => d.User).WithMany(p => p.VehicleUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Vehicle_User");
        });

        modelBuilder.Entity<VehicleImage>(entity =>
        {
            entity.ToTable("VehicleImage");

            entity.HasIndex(e => e.VehicleId, "IX_VehicleImage_VehicleId");

            entity.HasIndex(e => e.VehicleId, "UX_VehicleImage_Primary")
                .IsUnique()
                .HasFilter("([IsPrimary]=(1))");

            entity.Property(e => e.VehicleImageId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.ImageUrl).HasMaxLength(500);
            entity.Property(e => e.UploadedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");

            entity.HasOne(d => d.Vehicle).WithMany(p => p.VehicleImages)
                .HasForeignKey(d => d.VehicleId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("FK_VehicleImage_Vehicle");
        });

        modelBuilder.Entity<Voucher>(entity =>
        {
            entity.ToTable("Voucher");

            entity.HasIndex(e => new { e.IsActive, e.StartUtc, e.EndUtc }, "IX_Voucher_Active_DateRange").HasFilter("([IsActive]=(1))");

            entity.HasIndex(e => e.BranchId, "IX_Voucher_BranchId")
                .HasFilter("[BranchId] IS NOT NULL");

            entity.HasIndex(e => e.ApprovedByUserId, "IX_Voucher_ApprovedByUserId");

            entity.HasIndex(e => e.CreatedByUserId, "IX_Voucher_CreatedByUserId");

            entity.HasIndex(e => e.VoucherCode, "UQ_Voucher_Code").IsUnique();

            entity.Property(e => e.VoucherId).HasDefaultValueSql("(newsequentialid())");
            entity.Property(e => e.ApprovalStatus).HasDefaultValue((byte)1);
            entity.Property(e => e.ApprovedAtUtc).HasPrecision(3);
            entity.Property(e => e.CreatedAtUtc)
                .HasPrecision(3)
                .HasDefaultValueSql("(sysutcdatetime())");
            entity.Property(e => e.DiscountValue).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.EndUtc).HasPrecision(3);
            entity.Property(e => e.IsActive).HasDefaultValue(true);
            entity.Property(e => e.MaxDiscountAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.MinOrderAmount).HasColumnType("decimal(18, 2)");
            entity.Property(e => e.RowVersion)
                .IsRowVersion()
                .IsConcurrencyToken();
            entity.Property(e => e.StartUtc).HasPrecision(3);
            entity.Property(e => e.VoucherCode)
                .HasMaxLength(50)
                .IsUnicode(false);

            entity.HasOne(d => d.Branch).WithMany(p => p.Vouchers)
                .HasForeignKey(d => d.BranchId)
                .HasConstraintName("FK_Voucher_Branch");

            entity.HasOne(d => d.ApprovedByUser).WithMany(p => p.VoucherApprovedByUsers)
                .HasForeignKey(d => d.ApprovedByUserId)
                .HasConstraintName("FK_Voucher_ApprovedBy");

            entity.HasOne(d => d.CreatedByUser).WithMany(p => p.VoucherCreatedByUsers)
                .HasForeignKey(d => d.CreatedByUserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("FK_Voucher_CreatedBy");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
