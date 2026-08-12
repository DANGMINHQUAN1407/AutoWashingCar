CREATE DATABASE WashingCar;
GO
USE WashingCar;
GO

/* ============================================================
   WashingCar — Database Schema
   Target  : SQL Server 2019+
   Schema  : [dbo]
   ============================================================ */

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

/* ============================================================
   PHASE 1 — Root tables
   ============================================================ */

/* ---------- [User] ----------------------------------------- */
CREATE TABLE [dbo].[User] (
    UserId          UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_User_UserId       DEFAULT NEWSEQUENTIALID(),
    FullName        NVARCHAR(200)    NOT NULL,
    Email           VARCHAR(255)     NULL,
    PhoneNumber     VARCHAR(20)      NULL,
    PasswordHash    NVARCHAR(500)    NULL,
    Role            NVARCHAR(20)     NOT NULL,
    IsGuest         BIT              NOT NULL CONSTRAINT DF_User_IsGuest      DEFAULT (0),
    IsActive        BIT              NOT NULL CONSTRAINT DF_User_IsActive     DEFAULT (1),
    IsDeleted       BIT              NOT NULL CONSTRAINT DF_User_IsDeleted    DEFAULT (0),
    DeletedAtUtc    DATETIME2(3)     NULL,
    DeletedByUserId UNIQUEIDENTIFIER NULL,
    BranchId        UNIQUEIDENTIFIER NULL,
    CreatedAtUtc    DATETIME2(3)     NOT NULL CONSTRAINT DF_User_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc    DATETIME2(3)     NULL,
    RowVersion      ROWVERSION       NOT NULL,
    CONSTRAINT PK_User           PRIMARY KEY CLUSTERED (UserId),
    CONSTRAINT FK_User_DeletedBy FOREIGN KEY (DeletedByUserId) REFERENCES [dbo].[User](UserId),
    CONSTRAINT CK_User_Role CHECK (
        Role IN ('Customer', 'Staff', 'Manager', 'Admin')
    ),
    CONSTRAINT CK_User_DeleteState CHECK (
        (IsDeleted = 0 AND DeletedAtUtc IS NULL AND DeletedByUserId IS NULL)
        OR
        (IsDeleted = 1 AND DeletedAtUtc IS NOT NULL)
    )
);
GO

CREATE UNIQUE INDEX UX_User_Email
    ON [dbo].[User](Email)
    WHERE Email IS NOT NULL AND IsDeleted = 0;
CREATE UNIQUE INDEX UQ_User_PhoneNumber
    ON [dbo].[User](PhoneNumber)
    WHERE PhoneNumber IS NOT NULL;
CREATE INDEX IX_User_BranchId
    ON [dbo].[User](BranchId)
    WHERE BranchId IS NOT NULL;
GO

/* ---------- [Branch] --------------------------------------- */
CREATE TABLE [dbo].[Branch] (
    BranchId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Branch_BranchId     DEFAULT NEWSEQUENTIALID(),
    BranchCode   VARCHAR(20)      NOT NULL,
    Name         NVARCHAR(200)    NOT NULL,
    Address      NVARCHAR(500)    NOT NULL,
    City         NVARCHAR(100)    NOT NULL,
    Phone        VARCHAR(20)      NOT NULL,
    Email        VARCHAR(255)     NULL,
    Latitude     DECIMAL(9,6)     NULL,
    Longitude    DECIMAL(9,6)     NULL,
    OpenTime     TIME             NOT NULL,
    CloseTime    TIME             NOT NULL,
    ManagerId    UNIQUEIDENTIFIER NULL,
    IsActive     BIT              NOT NULL CONSTRAINT DF_Branch_IsActive     DEFAULT (1),
    CreatedAtUtc DATETIME2(3)     NOT NULL CONSTRAINT DF_Branch_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    UpdatedAtUtc DATETIME2(3)     NULL,
    CONSTRAINT PK_Branch         PRIMARY KEY CLUSTERED (BranchId),
    CONSTRAINT UQ_Branch_Code    UNIQUE (BranchCode),
    CONSTRAINT FK_Branch_Manager FOREIGN KEY (ManagerId) REFERENCES [dbo].[User](UserId) ON DELETE SET NULL
);
GO

ALTER TABLE [dbo].[User]
    ADD CONSTRAINT FK_User_Branch FOREIGN KEY (BranchId) REFERENCES [dbo].[Branch](BranchId) ON DELETE SET NULL;
GO

CREATE INDEX IX_Branch_ManagerId ON [dbo].[Branch](ManagerId);
GO

/* ---------- [Tier] ----------------------------------------- */
CREATE TABLE [dbo].[Tier] (
    TierId         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Tier_TierId       DEFAULT NEWSEQUENTIALID(),
    TierName       NVARCHAR(100)    NOT NULL,
    MinPoints      INT              NOT NULL,
    EarnRate       DECIMAL(5,2)     NOT NULL,
    Benefits       NVARCHAR(500)    NULL,
    IsActive       BIT              NOT NULL CONSTRAINT DF_Tier_IsActive     DEFAULT (1),
    CreatedAtUtc   DATETIME2(3)     NOT NULL CONSTRAINT DF_Tier_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Tier           PRIMARY KEY CLUSTERED (TierId),
    CONSTRAINT UQ_Tier_TierName  UNIQUE (TierName),
    CONSTRAINT UQ_Tier_MinPoints UNIQUE (MinPoints),
    CONSTRAINT CK_Tier_MinPoints CHECK (MinPoints >= 0),
    CONSTRAINT CK_Tier_EarnRate  CHECK (EarnRate  >= 0)
);
GO

/* ---------- [TierBenefit] ---------------------------------- */
CREATE TABLE [dbo].[TierBenefit] (
    TierBenefitId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_TB_Id           DEFAULT NEWSEQUENTIALID(),
    TierId        UNIQUEIDENTIFIER NOT NULL,
    BenefitType   TINYINT          NOT NULL,    -- 1=DiscountPercent 2=AdvanceBookingDays 3=FreeService 4=PrioritySupport 5=BonusPointPercent
    BenefitValue  NVARCHAR(200)    NOT NULL,
    Description   NVARCHAR(500)    NULL,
    IsActive      BIT              NOT NULL CONSTRAINT DF_TB_IsActive     DEFAULT (1),
    CreatedAtUtc  DATETIME2(3)     NOT NULL CONSTRAINT DF_TB_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TierBenefit      PRIMARY KEY CLUSTERED (TierBenefitId),
    CONSTRAINT FK_TierBenefit_Tier FOREIGN KEY (TierId) REFERENCES [dbo].[Tier](TierId) ON DELETE CASCADE
);
GO

CREATE UNIQUE INDEX UQ_TierBenefit_Tier_Type ON [dbo].[TierBenefit](TierId, BenefitType);
GO

/* ---------- [ServiceCatalogItem] --------------------------- */
CREATE TABLE [dbo].[ServiceCatalogItem] (
    ServiceCatalogItemId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_SCI_Id           DEFAULT NEWSEQUENTIALID(),
    ServiceName          NVARCHAR(200)    NOT NULL,
    Description          NVARCHAR(1000)   NULL,
    BasePrice            DECIMAL(18,2)    NOT NULL,
    DurationMinutes      SMALLINT         NOT NULL,
    IsActive             BIT              NOT NULL CONSTRAINT DF_SCI_IsActive     DEFAULT (1),
    CreatedAtUtc         DATETIME2(3)     NOT NULL CONSTRAINT DF_SCI_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_ServiceCatalogItem PRIMARY KEY CLUSTERED (ServiceCatalogItemId),
    CONSTRAINT CK_SCI_BasePrice      CHECK (BasePrice >= 0),
    CONSTRAINT CK_SCI_Duration       CHECK (DurationMinutes BETWEEN 1 AND 1440)
);
GO

/* ---------- [SlotInventory] -------------------------------- */
CREATE TABLE [dbo].[SlotInventory] (
    SlotInventoryId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Slot_Id           DEFAULT NEWSEQUENTIALID(),
    BranchId            UNIQUEIDENTIFIER NOT NULL,
    SlotDate            DATE             NOT NULL,
    SlotStartTime       TIME             NOT NULL,
    SlotEndTime         TIME             NOT NULL,
    Capacity            SMALLINT         NOT NULL,
    OnlineReservedCount SMALLINT         NOT NULL CONSTRAINT DF_Slot_Online       DEFAULT (0),
    WalkInReservedCount SMALLINT         NOT NULL CONSTRAINT DF_Slot_WalkIn       DEFAULT (0),
    CreatedAtUtc        DATETIME2(3)     NOT NULL CONSTRAINT DF_Slot_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    RowVersion          ROWVERSION       NOT NULL,
    CONSTRAINT PK_SlotInventory        PRIMARY KEY CLUSTERED (SlotInventoryId),
    CONSTRAINT FK_SlotInventory_Branch FOREIGN KEY (BranchId) REFERENCES [dbo].[Branch](BranchId),
    CONSTRAINT CK_Slot_Capacity        CHECK (Capacity > 0),
    CONSTRAINT CK_Slot_TimeOrder       CHECK (SlotEndTime > SlotStartTime),
    CONSTRAINT CK_Slot_Counts          CHECK (OnlineReservedCount >= 0 AND WalkInReservedCount >= 0
                                           AND OnlineReservedCount + WalkInReservedCount <= Capacity)
);
GO

CREATE UNIQUE INDEX UQ_SlotInventory_Branch_DateTime ON [dbo].[SlotInventory](BranchId, SlotDate, SlotStartTime);
CREATE INDEX IX_SlotInventory_SlotDate  ON [dbo].[SlotInventory](SlotDate);
CREATE INDEX IX_SlotInventory_BranchId  ON [dbo].[SlotInventory](BranchId);
GO

/* ---------- [BranchService] -------------------------------- */
CREATE TABLE [dbo].[BranchService] (
    BranchId             UNIQUEIDENTIFIER NOT NULL,
    ServiceCatalogItemId UNIQUEIDENTIFIER NOT NULL,
    IsActive             BIT              NOT NULL CONSTRAINT DF_BS_IsActive   DEFAULT (1),
    AddedAtUtc           DATETIME2(3)     NOT NULL CONSTRAINT DF_BS_AddedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_BranchService        PRIMARY KEY CLUSTERED (BranchId, ServiceCatalogItemId),
    CONSTRAINT FK_BranchService_Branch  FOREIGN KEY (BranchId)             REFERENCES [dbo].[Branch](BranchId)             ON DELETE CASCADE,
    CONSTRAINT FK_BranchService_Service FOREIGN KEY (ServiceCatalogItemId) REFERENCES [dbo].[ServiceCatalogItem](ServiceCatalogItemId) ON DELETE CASCADE
);
GO

CREATE INDEX IX_BranchService_ServiceCatalogItemId ON [dbo].[BranchService](ServiceCatalogItemId);
GO

/* ============================================================
   PHASE 2 — Depends on User / Tier / ServiceCatalogItem
   ============================================================ */

/* ---------- [RefreshToken] --------------------------------- */
CREATE TABLE [dbo].[RefreshToken] (
    RefreshTokenId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_RT_Id           DEFAULT NEWSEQUENTIALID(),
    UserId         UNIQUEIDENTIFIER NOT NULL,
    Token          NVARCHAR(500)    NOT NULL,
    ExpiresAtUtc   DATETIME2(3)     NOT NULL,
    RevokedAtUtc   DATETIME2(3)     NULL,
    CreatedAtUtc   DATETIME2(3)     NOT NULL CONSTRAINT DF_RT_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RefreshToken       PRIMARY KEY CLUSTERED (RefreshTokenId),
    CONSTRAINT UQ_RefreshToken_Token UNIQUE (Token),
    CONSTRAINT FK_RefreshToken_User  FOREIGN KEY (UserId) REFERENCES [dbo].[User](UserId) ON DELETE CASCADE
);
GO

CREATE INDEX IX_RefreshToken_UserId ON [dbo].[RefreshToken](UserId);
GO

/* ---------- [Vehicle] -------------------------------------- */
CREATE TABLE [dbo].[Vehicle] (
    VehicleId       UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Vehicle_Id           DEFAULT NEWSEQUENTIALID(),
    UserId          UNIQUEIDENTIFIER NOT NULL,
    LicensePlate    VARCHAR(20)      NOT NULL,
    VehicleType     TINYINT          NOT NULL,
    Brand           NVARCHAR(100)    NULL,
    IsDeleted       BIT              NOT NULL CONSTRAINT DF_Vehicle_IsDeleted    DEFAULT (0),
    DeletedAtUtc    DATETIME2(3)     NULL,
    DeletedByUserId UNIQUEIDENTIFIER NULL,
    CreatedAtUtc    DATETIME2(3)     NOT NULL CONSTRAINT DF_Vehicle_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    RowVersion      ROWVERSION       NOT NULL,
    CONSTRAINT PK_Vehicle           PRIMARY KEY CLUSTERED (VehicleId),
    CONSTRAINT FK_Vehicle_User      FOREIGN KEY (UserId)          REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_Vehicle_DeletedBy FOREIGN KEY (DeletedByUserId) REFERENCES [dbo].[User](UserId)
);
GO

CREATE UNIQUE INDEX UX_Vehicle_LicensePlate ON [dbo].[Vehicle](LicensePlate) WHERE IsDeleted = 0;
CREATE INDEX IX_Vehicle_UserId ON [dbo].[Vehicle](UserId);
GO

/* ---------- [LoyaltyAccount] ------------------------------- */
CREATE TABLE [dbo].[LoyaltyAccount] (
    LoyaltyAccountId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_LA_Id            DEFAULT NEWSEQUENTIALID(),
    UserId           UNIQUEIDENTIFIER NOT NULL,
    TierId           UNIQUEIDENTIFIER NOT NULL,
    CurrentPoints    INT              NOT NULL CONSTRAINT DF_LA_CurrentPoints DEFAULT (0),
    LifetimePoints   INT              NOT NULL CONSTRAINT DF_LA_LifetimePts   DEFAULT (0),
    UpdatedAtUtc     DATETIME2(3)     NOT NULL CONSTRAINT DF_LA_UpdatedAtUtc  DEFAULT SYSUTCDATETIME(),
    RowVersion       ROWVERSION       NOT NULL,
    CONSTRAINT PK_LoyaltyAccount      PRIMARY KEY CLUSTERED (LoyaltyAccountId),
    CONSTRAINT UQ_LoyaltyAccount_User UNIQUE (UserId),
    CONSTRAINT FK_LoyaltyAccount_User FOREIGN KEY (UserId) REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_LoyaltyAccount_Tier FOREIGN KEY (TierId) REFERENCES [dbo].[Tier](TierId),
    CONSTRAINT CK_LA_Points           CHECK (CurrentPoints >= 0 AND LifetimePoints >= 0
                                          AND CurrentPoints <= LifetimePoints)
);
GO

CREATE INDEX IX_LoyaltyAccount_TierId ON [dbo].[LoyaltyAccount](TierId);
GO

/* ---------- [Voucher] -------------------------------------- */
CREATE TABLE [dbo].[Voucher] (
    VoucherId         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Voucher_Id           DEFAULT NEWSEQUENTIALID(),
    VoucherCode       VARCHAR(50)      NOT NULL,
    VoucherType       TINYINT          NOT NULL,
    DiscountType      TINYINT          NOT NULL,
    DiscountValue     DECIMAL(18,2)    NOT NULL,
    MinOrderAmount    DECIMAL(18,2)    NULL,
    MaxDiscountAmount DECIMAL(18,2)    NULL,
    Quantity          INT              NOT NULL,
    UsedCount         INT              NOT NULL CONSTRAINT DF_Voucher_UsedCount    DEFAULT (0),
    StartUtc          DATETIME2(3)     NOT NULL,
    EndUtc            DATETIME2(3)     NOT NULL,
    IsActive          BIT              NOT NULL CONSTRAINT DF_Voucher_IsActive     DEFAULT (1),
    ApprovalStatus    TINYINT          NOT NULL CONSTRAINT DF_Voucher_Approval     DEFAULT (1),
    BranchId          UNIQUEIDENTIFIER NULL,
    CreatedByUserId   UNIQUEIDENTIFIER NOT NULL,
    ApprovedByUserId  UNIQUEIDENTIFIER NULL,
    ApprovedAtUtc     DATETIME2(3)     NULL,
    CreatedAtUtc      DATETIME2(3)     NOT NULL CONSTRAINT DF_Voucher_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    RequiredPoints    INT              NOT NULL CONSTRAINT DF_Voucher_RequiredPoints DEFAULT (0),
    RowVersion        ROWVERSION       NOT NULL,
    CONSTRAINT PK_Voucher            PRIMARY KEY CLUSTERED (VoucherId),
    CONSTRAINT UQ_Voucher_Code       UNIQUE (VoucherCode),
    CONSTRAINT FK_Voucher_Branch     FOREIGN KEY (BranchId)         REFERENCES [dbo].[Branch](BranchId),
    CONSTRAINT FK_Voucher_CreatedBy  FOREIGN KEY (CreatedByUserId)  REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_Voucher_ApprovedBy FOREIGN KEY (ApprovedByUserId) REFERENCES [dbo].[User](UserId),
    CONSTRAINT CK_Voucher_Type       CHECK (VoucherType IN (1, 2, 3)),
    CONSTRAINT CK_Voucher_Approval   CHECK (ApprovalStatus IN (1, 2, 3)),
    CONSTRAINT CK_Voucher_Quantity   CHECK (Quantity >= 0 AND UsedCount >= 0 AND UsedCount <= Quantity),
    CONSTRAINT CK_Voucher_DateRange  CHECK (EndUtc > StartUtc),
    CONSTRAINT CK_Voucher_ApprovalState CHECK (
        (ApprovalStatus = 1 AND ApprovedByUserId IS NULL AND ApprovedAtUtc IS NULL)
        OR
        (ApprovalStatus IN (2, 3) AND ApprovedByUserId IS NOT NULL AND ApprovedAtUtc IS NOT NULL)
    )
);
GO

CREATE INDEX IX_Voucher_CreatedByUserId  ON [dbo].[Voucher](CreatedByUserId);
CREATE INDEX IX_Voucher_ApprovedByUserId ON [dbo].[Voucher](ApprovedByUserId);
CREATE INDEX IX_Voucher_Active_DateRange ON [dbo].[Voucher](IsActive, StartUtc, EndUtc) WHERE IsActive = 1;
CREATE INDEX IX_Voucher_BranchId         ON [dbo].[Voucher](BranchId) WHERE BranchId IS NOT NULL;
GO

/* ---------- [TierVoucher] ---------------------------------- */
CREATE TABLE [dbo].[TierVoucher] (
    TierVoucherId  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_TV_Id           DEFAULT NEWSEQUENTIALID(),
    TierId         UNIQUEIDENTIFIER NOT NULL,
    VoucherId      UNIQUEIDENTIFIER NOT NULL,
    RequiredPoints INT              NOT NULL,
    CreatedAtUtc   DATETIME2(3)     NOT NULL CONSTRAINT DF_TV_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_TierVoucher         PRIMARY KEY CLUSTERED (TierVoucherId),
    CONSTRAINT UQ_TierVoucher_Pair    UNIQUE (TierId, VoucherId),
    CONSTRAINT FK_TierVoucher_Tier    FOREIGN KEY (TierId)    REFERENCES [dbo].[Tier](TierId),
    CONSTRAINT FK_TierVoucher_Voucher FOREIGN KEY (VoucherId) REFERENCES [dbo].[Voucher](VoucherId),
    CONSTRAINT CK_TV_RequiredPoints   CHECK (RequiredPoints >= 0)
);
GO

CREATE INDEX IX_TierVoucher_VoucherId ON [dbo].[TierVoucher](VoucherId);
GO

/* ---------- [UserVoucher] ---------------------------------- */
CREATE TABLE [dbo].[UserVoucher] (
    UserVoucherId  UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_UV_Id            DEFAULT NEWSEQUENTIALID(),
    UserId         UNIQUEIDENTIFIER NOT NULL,
    VoucherId      UNIQUEIDENTIFIER NOT NULL,
    RedeemedPoints INT              NOT NULL,
    VoucherStatus  TINYINT          NOT NULL CONSTRAINT DF_UV_Status        DEFAULT (1),
    RedeemedAtUtc  DATETIME2(3)     NOT NULL CONSTRAINT DF_UV_RedeemedAtUtc DEFAULT SYSUTCDATETIME(),
    ExpiredAtUtc   DATETIME2(3)     NULL,
    UsedAtUtc      DATETIME2(3)     NULL,
    CONSTRAINT PK_UserVoucher         PRIMARY KEY CLUSTERED (UserVoucherId),
    CONSTRAINT FK_UserVoucher_User    FOREIGN KEY (UserId)    REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_UserVoucher_Voucher FOREIGN KEY (VoucherId) REFERENCES [dbo].[Voucher](VoucherId),
    CONSTRAINT CK_UV_Status           CHECK (VoucherStatus IN (1, 2, 3, 4)),
    CONSTRAINT CK_UV_RedeemedPoints   CHECK (RedeemedPoints >= 0),
    CONSTRAINT CK_UV_UsedAt           CHECK (
        (VoucherStatus = 2 AND UsedAtUtc IS NOT NULL)
        OR
        (VoucherStatus <> 2 AND UsedAtUtc IS NULL)
    )
);
GO

CREATE INDEX IX_UserVoucher_UserId_Status ON [dbo].[UserVoucher](UserId, VoucherStatus);
CREATE INDEX IX_UserVoucher_VoucherId     ON [dbo].[UserVoucher](VoucherId);
GO

/* ============================================================
   PHASE 3 — Booking
   ============================================================ */

/* ---------- [Booking] -------------------------------------- */
CREATE TABLE [dbo].[Booking] (
    BookingId             UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Booking_Id              DEFAULT NEWSEQUENTIALID(),
    UserId                UNIQUEIDENTIFIER NOT NULL,
    VehicleId             UNIQUEIDENTIFIER NOT NULL,
    BranchId              UNIQUEIDENTIFIER NOT NULL,
    SlotInventoryId       UNIQUEIDENTIFIER NOT NULL,
    UserVoucherId         UNIQUEIDENTIFIER NULL,
    BookingCode           VARCHAR(50)      NOT NULL,
    CheckInQrCode         NVARCHAR(500)    NOT NULL,
    BookingType           TINYINT          NOT NULL,
    BookingStatus         TINYINT          NOT NULL,
    BookingSubtotal       DECIMAL(18,2)    NOT NULL,
    BookingDiscountAmount DECIMAL(18,2)    NOT NULL CONSTRAINT DF_Booking_Discount        DEFAULT (0),
    BookingFinalAmount    DECIMAL(18,2)    NOT NULL,
    DepositAmount         DECIMAL(18,2)    NULL,
    EarnedPoints          INT              NOT NULL CONSTRAINT DF_Booking_Earned          DEFAULT (0),
    RedeemedPoints        INT              NOT NULL CONSTRAINT DF_Booking_Redeemed        DEFAULT (0),
    CheckInAtUtc          DATETIME2(3)     NULL,
    CheckedInByUserId     UNIQUEIDENTIFIER NULL,
    AssignedStaffId       UNIQUEIDENTIFIER NULL,
    CompletedAtUtc        DATETIME2(3)     NULL,
    AssignedAtUtc         DATETIME2(3)     NULL,
    ReminderSentAtUtc     DATETIME2(3)     NULL,
    CreatedAtUtc          DATETIME2(3)     NOT NULL CONSTRAINT DF_Booking_CreatedAtUtc    DEFAULT SYSUTCDATETIME(),
    RowVersion            ROWVERSION       NOT NULL,
    CONSTRAINT PK_Booking             PRIMARY KEY CLUSTERED (BookingId),
    CONSTRAINT UQ_Booking_Code        UNIQUE (BookingCode),
    CONSTRAINT UQ_Booking_QrCode      UNIQUE (CheckInQrCode),
    CONSTRAINT FK_Booking_User        FOREIGN KEY (UserId)            REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_Booking_Vehicle     FOREIGN KEY (VehicleId)         REFERENCES [dbo].[Vehicle](VehicleId),
    CONSTRAINT FK_Booking_Branch      FOREIGN KEY (BranchId)          REFERENCES [dbo].[Branch](BranchId),
    CONSTRAINT FK_Booking_Slot        FOREIGN KEY (SlotInventoryId)   REFERENCES [dbo].[SlotInventory](SlotInventoryId),
    CONSTRAINT FK_Booking_UserVoucher FOREIGN KEY (UserVoucherId)     REFERENCES [dbo].[UserVoucher](UserVoucherId),
    CONSTRAINT FK_Booking_CheckedInBy FOREIGN KEY (CheckedInByUserId) REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_Booking_AssignedStaff FOREIGN KEY (AssignedStaffId) REFERENCES [dbo].[User](UserId),
    CONSTRAINT CK_Booking_Amounts     CHECK (BookingSubtotal >= 0 AND BookingDiscountAmount >= 0
                                          AND BookingFinalAmount >= 0
                                          AND BookingFinalAmount = BookingSubtotal - BookingDiscountAmount),
    CONSTRAINT CK_Booking_Deposit     CHECK (DepositAmount IS NULL OR DepositAmount >= 0),
    CONSTRAINT CK_Booking_Points      CHECK (EarnedPoints >= 0 AND RedeemedPoints >= 0)
);
GO

CREATE UNIQUE INDEX UX_Booking_UserVoucherId
    ON [dbo].[Booking](UserVoucherId)
    WHERE UserVoucherId IS NOT NULL;

CREATE INDEX IX_Booking_UserId            ON [dbo].[Booking](UserId);
CREATE INDEX IX_Booking_VehicleId         ON [dbo].[Booking](VehicleId);
CREATE INDEX IX_Booking_BranchId          ON [dbo].[Booking](BranchId);
CREATE INDEX IX_Booking_SlotInventoryId   ON [dbo].[Booking](SlotInventoryId);
CREATE INDEX IX_Booking_CheckedInByUserId ON [dbo].[Booking](CheckedInByUserId) WHERE CheckedInByUserId IS NOT NULL;
CREATE INDEX IX_Booking_AssignedStaffId   ON [dbo].[Booking](AssignedStaffId) WHERE AssignedStaffId IS NOT NULL;
CREATE INDEX IX_Booking_Status_CreatedAt  ON [dbo].[Booking](BookingStatus, CreatedAtUtc DESC);
GO

/* ---------- [BookingLine] ---------------------------------- */
CREATE TABLE [dbo].[BookingLine] (
    BookingLineId        UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_BL_Id DEFAULT NEWSEQUENTIALID(),
    BookingId            UNIQUEIDENTIFIER NOT NULL,
    ServiceCatalogItemId UNIQUEIDENTIFIER NOT NULL,
    ServiceName          NVARCHAR(200)    NOT NULL,
    UnitPrice            DECIMAL(18,2)    NOT NULL,
    DurationMinutes      SMALLINT         NOT NULL,
    Quantity             SMALLINT         NOT NULL,
    LineTotal            DECIMAL(18,2)    NOT NULL,
    CONSTRAINT PK_BookingLine         PRIMARY KEY CLUSTERED (BookingLineId),
    CONSTRAINT FK_BookingLine_Booking FOREIGN KEY (BookingId)            REFERENCES [dbo].[Booking](BookingId) ON DELETE CASCADE,
    CONSTRAINT FK_BookingLine_Service FOREIGN KEY (ServiceCatalogItemId) REFERENCES [dbo].[ServiceCatalogItem](ServiceCatalogItemId),
    CONSTRAINT CK_BL_Numbers          CHECK (Quantity > 0 AND UnitPrice >= 0 AND LineTotal >= 0
                                         AND DurationMinutes > 0)
);
GO

CREATE INDEX IX_BookingLine_BookingId            ON [dbo].[BookingLine](BookingId);
CREATE INDEX IX_BookingLine_ServiceCatalogItemId ON [dbo].[BookingLine](ServiceCatalogItemId);
GO

/* ============================================================
   PHASE 4 — Payment / TenderAllocation / Loyalty Ledger
   ============================================================ */

/* ---------- [Payment] -------------------------------------- */
CREATE TABLE [dbo].[Payment] (
    PaymentId         UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Payment_Id           DEFAULT NEWSEQUENTIALID(),
    BookingId         UNIQUEIDENTIFIER NOT NULL,
    PaymentType       TINYINT          NOT NULL,
    PaymentMethod     TINYINT          NOT NULL,
    PaymentStatus     TINYINT          NOT NULL,
    Amount            DECIMAL(18,2)    NOT NULL,
    TransactionCode   VARCHAR(100)     NULL,
    PaidAtUtc         DATETIME2(3)     NULL,
    OriginalPaymentId UNIQUEIDENTIFIER NULL,
    RefundReason      NVARCHAR(500)    NULL,
    RefundedByUserId  UNIQUEIDENTIFIER NULL,
    CreatedAtUtc      DATETIME2(3)     NOT NULL CONSTRAINT DF_Payment_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    RowVersion        ROWVERSION       NOT NULL,
    CONSTRAINT PK_Payment             PRIMARY KEY CLUSTERED (PaymentId),
    CONSTRAINT FK_Payment_Booking     FOREIGN KEY (BookingId)         REFERENCES [dbo].[Booking](BookingId),
    CONSTRAINT FK_Payment_Original    FOREIGN KEY (OriginalPaymentId) REFERENCES [dbo].[Payment](PaymentId),
    CONSTRAINT FK_Payment_RefundedBy  FOREIGN KEY (RefundedByUserId)  REFERENCES [dbo].[User](UserId),
    CONSTRAINT CK_Payment_Type        CHECK (PaymentType   IN (1, 2, 3, 4)),
    CONSTRAINT CK_Payment_Method      CHECK (PaymentMethod IN (1, 2, 3, 4)),
    CONSTRAINT CK_Payment_Status      CHECK (PaymentStatus IN (1, 2, 3, 4)),
    CONSTRAINT CK_Payment_Amount      CHECK (Amount > 0),
    CONSTRAINT CK_Payment_RefundShape CHECK (
        (PaymentType <> 4 AND OriginalPaymentId IS NULL AND RefundReason IS NULL AND RefundedByUserId IS NULL)
        OR
        (PaymentType =  4 AND OriginalPaymentId IS NOT NULL AND RefundReason IS NOT NULL AND RefundedByUserId IS NOT NULL)
    )
);
GO

CREATE INDEX IX_Payment_BookingId         ON [dbo].[Payment](BookingId);
CREATE INDEX IX_Payment_Status_CreatedAt  ON [dbo].[Payment](PaymentStatus, CreatedAtUtc DESC);
CREATE INDEX IX_Payment_OriginalPaymentId ON [dbo].[Payment](OriginalPaymentId) WHERE OriginalPaymentId IS NOT NULL;
GO

/* ---------- [TenderAllocation] ----------------------------- */
CREATE TABLE [dbo].[TenderAllocation] (
    TenderAllocationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_TA_Id DEFAULT NEWSEQUENTIALID(),
    PaymentId          UNIQUEIDENTIFIER NOT NULL,
    TenderType         TINYINT          NOT NULL,
    Amount             DECIMAL(18,2)    NOT NULL,
    CONSTRAINT PK_TenderAllocation PRIMARY KEY CLUSTERED (TenderAllocationId),
    CONSTRAINT FK_TA_Payment       FOREIGN KEY (PaymentId) REFERENCES [dbo].[Payment](PaymentId) ON DELETE CASCADE,
    CONSTRAINT CK_TA_TenderType    CHECK (TenderType IN (1, 2, 3, 4)),
    CONSTRAINT CK_TA_Amount        CHECK (Amount > 0)
);
GO

CREATE INDEX IX_TenderAllocation_PaymentId ON [dbo].[TenderAllocation](PaymentId);
GO

/* ---------- [LoyaltyLedgerEntry] --------------------------- */
CREATE TABLE [dbo].[LoyaltyLedgerEntry] (
    LoyaltyLedgerEntryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_LLE_Id           DEFAULT NEWSEQUENTIALID(),
    LoyaltyAccountId     UNIQUEIDENTIFIER NOT NULL,
    UserId               UNIQUEIDENTIFIER NOT NULL,
    BookingId            UNIQUEIDENTIFIER NULL,
    EntryType            TINYINT          NOT NULL,
    Points               INT              NOT NULL,
    BalanceAfter         INT              NOT NULL,
    Description          NVARCHAR(500)    NULL,
    CreatedAtUtc         DATETIME2(3)     NOT NULL CONSTRAINT DF_LLE_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_LoyaltyLedgerEntry PRIMARY KEY CLUSTERED (LoyaltyLedgerEntryId),
    CONSTRAINT FK_LLE_LoyaltyAccount FOREIGN KEY (LoyaltyAccountId) REFERENCES [dbo].[LoyaltyAccount](LoyaltyAccountId),
    CONSTRAINT FK_LLE_User           FOREIGN KEY (UserId)           REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_LLE_Booking        FOREIGN KEY (BookingId)        REFERENCES [dbo].[Booking](BookingId),
    CONSTRAINT CK_LLE_EntryType      CHECK (EntryType IN (1, 2, 3, 4)),
    CONSTRAINT CK_LLE_BalanceAfter   CHECK (BalanceAfter >= 0),
    CONSTRAINT CK_LLE_PointsSign     CHECK (
        (EntryType IN (1, 4) AND Points <> 0)
        OR
        (EntryType IN (2, 3) AND Points < 0)
    )
);
GO

CREATE INDEX IX_LLE_LoyaltyAccount_Created ON [dbo].[LoyaltyLedgerEntry](LoyaltyAccountId, CreatedAtUtc DESC);
CREATE INDEX IX_LLE_UserId                 ON [dbo].[LoyaltyLedgerEntry](UserId);
CREATE INDEX IX_LLE_BookingId              ON [dbo].[LoyaltyLedgerEntry](BookingId) WHERE BookingId IS NOT NULL;
GO

/* ============================================================
   PHASE 5 — Review / AuditLog
   ============================================================ */

/* ---------- [Review] --------------------------------------- */
CREATE TABLE [dbo].[Review] (
    ReviewId     UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Review_Id           DEFAULT NEWSEQUENTIALID(),
    UserId       UNIQUEIDENTIFIER NOT NULL,
    BookingId    UNIQUEIDENTIFIER NOT NULL,
    ReviewType   INT              NOT NULL CONSTRAINT DF_Review_ReviewType   DEFAULT (1),
    Rating       TINYINT          NOT NULL,
    Comment      NVARCHAR(1000)   NULL,
    IsHidden     BIT              NOT NULL CONSTRAINT DF_Review_IsHidden     DEFAULT (0),
    CreatedAtUtc DATETIME2(3)     NOT NULL CONSTRAINT DF_Review_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    StaffId      UNIQUEIDENTIFIER NULL,
    CONSTRAINT PK_Review         PRIMARY KEY CLUSTERED (ReviewId),
    CONSTRAINT UQ_Review_Booking_Type UNIQUE (BookingId, ReviewType),
    CONSTRAINT FK_Review_User    FOREIGN KEY (UserId)    REFERENCES [dbo].[User](UserId),
    CONSTRAINT FK_Review_Booking FOREIGN KEY (BookingId) REFERENCES [dbo].[Booking](BookingId),
    CONSTRAINT FK_Review_Staff   FOREIGN KEY (StaffId)   REFERENCES [dbo].[User](UserId),
    CONSTRAINT CK_Review_Rating  CHECK (Rating BETWEEN 1 AND 5),
    CONSTRAINT CK_Review_Type    CHECK (ReviewType IN (1, 2))
);
GO

CREATE INDEX IX_Review_UserId  ON [dbo].[Review](UserId);
CREATE INDEX IX_Review_StaffId ON [dbo].[Review](StaffId) WHERE StaffId IS NOT NULL;
GO

/* ---------- [AuditLog] ------------------------------------- */
CREATE TABLE [dbo].[AuditLog] (
    AuditLogId   UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Audit_Id           DEFAULT NEWSEQUENTIALID(),
    UserId       UNIQUEIDENTIFIER NULL,
    Action       NVARCHAR(200)    NOT NULL,
    TableName    NVARCHAR(200)    NOT NULL,
    RecordId     UNIQUEIDENTIFIER NOT NULL,
    OldValues    NVARCHAR(MAX)    NULL,
    NewValues    NVARCHAR(MAX)    NULL,
    CreatedAtUtc DATETIME2(3)     NOT NULL CONSTRAINT DF_Audit_CreatedAtUtc DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_AuditLog      PRIMARY KEY CLUSTERED (AuditLogId),
    CONSTRAINT FK_AuditLog_User FOREIGN KEY (UserId) REFERENCES [dbo].[User](UserId)
);
GO

CREATE INDEX IX_AuditLog_Table_Record ON [dbo].[AuditLog](TableName, RecordId);
CREATE INDEX IX_AuditLog_UserId       ON [dbo].[AuditLog](UserId) WHERE UserId IS NOT NULL;
CREATE INDEX IX_AuditLog_CreatedAtUtc ON [dbo].[AuditLog](CreatedAtUtc DESC);
GO

/* ============================================================
   PHASE 6 — Tier reconciliation (stored proc + trigger)
   ============================================================ */

CREATE OR ALTER PROCEDURE [dbo].[usp_RecomputeUserTier]
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @LifetimePoints INT;
    DECLARE @ExpectedTierId UNIQUEIDENTIFIER;

    SELECT @LifetimePoints = LifetimePoints
    FROM [dbo].[LoyaltyAccount]
    WHERE UserId = @UserId;

    IF @LifetimePoints IS NULL RETURN;

    SELECT TOP 1 @ExpectedTierId = TierId
    FROM [dbo].[Tier]
    WHERE IsActive = 1 AND MinPoints <= @LifetimePoints
    ORDER BY MinPoints DESC;

    IF @ExpectedTierId IS NULL RETURN;

    UPDATE [dbo].[LoyaltyAccount]
       SET TierId       = @ExpectedTierId,
           UpdatedAtUtc = SYSUTCDATETIME()
     WHERE UserId  = @UserId
       AND TierId <> @ExpectedTierId;
END;
GO

CREATE OR ALTER TRIGGER [dbo].[trg_LLE_AfterInsert_RecomputeTier]
ON [dbo].[LoyaltyLedgerEntry]
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserId UNIQUEIDENTIFIER;
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT DISTINCT UserId FROM inserted;
    OPEN cur;
    FETCH NEXT FROM cur INTO @UserId;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC [dbo].[usp_RecomputeUserTier] @UserId;
        FETCH NEXT FROM cur INTO @UserId;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER PROCEDURE [dbo].[usp_ReconcileAllUserTiers]
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserId UNIQUEIDENTIFIER;
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT UserId FROM [dbo].[LoyaltyAccount];
    OPEN cur;
    FETCH NEXT FROM cur INTO @UserId;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC [dbo].[usp_RecomputeUserTier] @UserId;
        FETCH NEXT FROM cur INTO @UserId;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO

/* ============================================================
   PHASE 7 — EF Migration history
   ============================================================ */

CREATE TABLE [dbo].[__EFMigrationsHistory] (
    [MigrationId]    NVARCHAR(150) NOT NULL,
    [ProductVersion] NVARCHAR(32)  NOT NULL,
    CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
);
GO

INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES
    (N'20260605011234_InitialCreate',              N'8.0.11'),
    (N'20260611062708_AddBranchManagement',        N'8.0.11'),
    (N'20260611065953_MakePhoneNumberNullable',    N'8.0.11'),
    (N'20260611084943_AddBranchIdToVoucher',       N'8.0.11'),
    (N'20260617074819_RemoveBranchIsDeleted',      N'8.0.11'),
    (N'20260619071631_AddTierBenefit',             N'8.0.11'),
    (N'20260619170612_AddBookingReminderSentAt',   N'8.0.11'),
    (N'20260629062424_AddRequiredPointsToVoucher', N'8.0.11'),
    (N'20260629063455_AddDiscountTypeToVoucher3',  N'8.0.11'),
    (N'20260715165445_AddAssignedStaffAndReviewStaff', N'8.0.11'),
    (N'20260715170816_AddReviewTypeColumnCatchUp', N'8.0.11');
GO

/* ============================================================
   PHASE 8 — Initial Seed Data (Tiers, Branches, Services, Slots)
   ============================================================ */

-- 1. Seed Tiers (Bronze, Silver, Gold)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Tier] WHERE [TierId] = 'E1A0F908-1678-4395-88A9-2D052B3AA857')
BEGIN
    INSERT INTO [dbo].[Tier] ([TierId], [TierName], [MinPoints], [EarnRate], [Benefits], [IsActive])
    VALUES ('E1A0F908-1678-4395-88A9-2D052B3AA857', N'Bronze', 0, 1.00, N'Tích lũy điểm cơ bản', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Tier] WHERE [TierId] = '3B5E86E2-6EFA-46E0-BF20-E498457639EC')
BEGIN
    INSERT INTO [dbo].[Tier] ([TierId], [TierName], [MinPoints], [EarnRate], [Benefits], [IsActive])
    VALUES ('3B5E86E2-6EFA-46E0-BF20-E498457639EC', N'Silver', 500, 1.10, N'Giảm giá 5%, Đặt lịch trước 7 ngày', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Tier] WHERE [TierId] = '4A9F2F9C-E682-4E57-B2E8-8924375A224D')
BEGIN
    INSERT INTO [dbo].[Tier] ([TierId], [TierName], [MinPoints], [EarnRate], [Benefits], [IsActive])
    VALUES ('4A9F2F9C-E682-4E57-B2E8-8924375A224D', N'Gold', 1500, 1.25, N'Giảm giá 10%, Đặt lịch trước 14 ngày, Ưu tiên phục vụ', 1);
END;

-- 2. Seed Branches (BR-001, BR-002, BR-003)
IF NOT EXISTS (SELECT 1 FROM [dbo].[Branch] WHERE [BranchId] = '59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E')
BEGIN
    INSERT INTO [dbo].[Branch] ([BranchId], [BranchCode], [Name], [Address], [City], [Phone], [Email], [Latitude], [Longitude], [OpenTime], [CloseTime], [IsActive])
    VALUES (
        '59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', 
        'BR-001', 
        N'AutoWash Pro Quận 1', 
        N'123 Nguyễn Huệ, Phường Bến Nghé, Quận 1', 
        N'TP. Hồ Chí Minh', 
        '02873001234', 
        'q1@autowashpro.com', 
        10.775658, 
        106.700424, 
        '07:00:00', 
        '21:00:00', 
        1
    );
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Branch] WHERE [BranchId] = 'DC8ED0C9-880F-455F-912A-9494BFE69CFB')
BEGIN
    INSERT INTO [dbo].[Branch] ([BranchId], [BranchCode], [Name], [Address], [City], [Phone], [Email], [Latitude], [Longitude], [OpenTime], [CloseTime], [IsActive])
    VALUES (
        'DC8ED0C9-880F-455F-912A-9494BFE69CFB', 
        'BR-002', 
        N'AutoWash Pro Cầu Giấy', 
        N'45 Cầu Giấy, Phường Quan Hoa, Quận Cầu Giấy', 
        N'Hà Nội', 
        '02473005678', 
        'caugiay@autowashpro.com', 
        21.036237, 
        105.790583, 
        '07:30:00', 
        '21:30:00', 
        1
    );
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[Branch] WHERE [BranchId] = '93C68DFE-5207-4C70-AFDF-7080ECFA5DEB')
BEGIN
    INSERT INTO [dbo].[Branch] ([BranchId], [BranchCode], [Name], [Address], [City], [Phone], [Email], [Latitude], [Longitude], [OpenTime], [CloseTime], [IsActive])
    VALUES (
        '93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', 
        'BR-003', 
        N'AutoWash Pro Hải Châu', 
        N'88 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu', 
        N'Đà Nẵng', 
        '02363009999', 
        'haichau@autowashpro.com', 
        16.060342, 
        108.215579, 
        '08:00:00', 
        '20:00:00', 
        1
    );
END;

-- 3. Seed Service Catalog Items
IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [IsActive])
    VALUES ('0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3', N'Rửa xe cơ bản (Basic Wash)', N'Rửa thân xe, hút bụi thảm, lau kính cơ bản.', 150000.00, 30, 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = '4C3DF329-873F-4F7F-959D-9FBD60BCDE92')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [IsActive])
    VALUES ('4C3DF329-873F-4F7F-959D-9FBD60BCDE92', N'Rửa xe cao cấp & Phủ Wax', N'Rửa xe chi tiết, hút bụi sâu, làm bóng lốp, phủ sáp bảo vệ sơn.', 300000.00, 45, 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = '3B8D4CD8-87A7-4404-BC49-2C62FCE5762D')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [IsActive])
    VALUES ('3B8D4CD8-87A7-4404-BC49-2C62FCE5762D', N'Vệ sinh nội thất chuyên sâu', N'Giặt ghế da/nỉ, khử mùi ozone, vệ sinh bảng điều khiển và khe gió điều hòa.', 800000.00, 120, 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[ServiceCatalogItem] WHERE [ServiceCatalogItemId] = '2B4958CE-F23B-4AEB-B459-2E24BD36EF7D')
BEGIN
    INSERT INTO [dbo].[ServiceCatalogItem] ([ServiceCatalogItemId], [ServiceName], [Description], [BasePrice], [DurationMinutes], [IsActive])
    VALUES ('2B4958CE-F23B-4AEB-B459-2E24BD36EF7D', N'Combo toàn diện (Ultimate Combo)', N'Rửa xe cao cấp + Phủ Wax + Vệ sinh nội thất chuyên sâu + Rửa khoang động cơ.', 1200000.00, 180, 1);
END;

-- 4. Seed Branch Service Allocation (Assign all services to all branches)
IF NOT EXISTS (SELECT 1 FROM [dbo].[BranchService] WHERE [BranchId] = '59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E' AND [ServiceCatalogItemId] = '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3')
BEGIN
    INSERT INTO [dbo].[BranchService] ([BranchId], [ServiceCatalogItemId], [IsActive]) VALUES
    ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3', 1),
    ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', '4C3DF329-873F-4F7F-959D-9FBD60BCDE92', 1),
    ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', '3B8D4CD8-87A7-4404-BC49-2C62FCE5762D', 1),
    ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', '2B4958CE-F23B-4AEB-B459-2E24BD36EF7D', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[BranchService] WHERE [BranchId] = 'DC8ED0C9-880F-455F-912A-9494BFE69CFB' AND [ServiceCatalogItemId] = '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3')
BEGIN
    INSERT INTO [dbo].[BranchService] ([BranchId], [ServiceCatalogItemId], [IsActive]) VALUES
    ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3', 1),
    ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', '4C3DF329-873F-4F7F-959D-9FBD60BCDE92', 1),
    ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', '3B8D4CD8-87A7-4404-BC49-2C62FCE5762D', 1),
    ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', '2B4958CE-F23B-4AEB-B459-2E24BD36EF7D', 1);
END;

IF NOT EXISTS (SELECT 1 FROM [dbo].[BranchService] WHERE [BranchId] = '93C68DFE-5207-4C70-AFDF-7080ECFA5DEB' AND [ServiceCatalogItemId] = '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3')
BEGIN
    INSERT INTO [dbo].[BranchService] ([BranchId], [ServiceCatalogItemId], [IsActive]) VALUES
    ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', '0F871E92-2D58-45F4-A0C3-CD0B9B34A3E3', 1),
    ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', '4C3DF329-873F-4F7F-959D-9FBD60BCDE92', 1),
    ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', '3B8D4CD8-87A7-4404-BC49-2C62FCE5762D', 1),
    ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', '2B4958CE-F23B-4AEB-B459-2E24BD36EF7D', 1);
END;

-- 5. Seed Slot Inventory (Create 9 slots daily for the next 7 days, starting from today, for each branch)
DECLARE @DateCounter DATE = CAST(GETDATE() AS DATE);
DECLARE @EndDate DATE = DATEADD(DAY, 7, CAST(GETDATE() AS DATE));

WHILE @DateCounter <= @EndDate
BEGIN
    -- Branch 1 (District 1)
    IF NOT EXISTS (SELECT 1 FROM [dbo].[SlotInventory] WHERE [BranchId] = '59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E' AND [SlotDate] = @DateCounter)
    BEGIN
        INSERT INTO [dbo].[SlotInventory] ([BranchId], [SlotDate], [SlotStartTime], [SlotEndTime], [Capacity], [OnlineReservedCount], [WalkInReservedCount]) VALUES
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '08:00:00', '09:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '09:00:00', '10:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '10:00:00', '11:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '11:00:00', '12:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '13:00:00', '14:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '14:00:00', '15:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '15:00:00', '16:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '16:00:00', '17:00:00', 3, 0, 0),
        ('59B4DF31-3BC8-48AE-A6E5-A8F8B60A812E', @DateCounter, '17:00:00', '18:00:00', 3, 0, 0);
    END;

    -- Branch 2 (Cau Giay)
    IF NOT EXISTS (SELECT 1 FROM [dbo].[SlotInventory] WHERE [BranchId] = 'DC8ED0C9-880F-455F-912A-9494BFE69CFB' AND [SlotDate] = @DateCounter)
    BEGIN
        INSERT INTO [dbo].[SlotInventory] ([BranchId], [SlotDate], [SlotStartTime], [SlotEndTime], [Capacity], [OnlineReservedCount], [WalkInReservedCount]) VALUES
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '08:00:00', '09:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '09:00:00', '10:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '10:00:00', '11:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '11:00:00', '12:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '13:00:00', '14:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '14:00:00', '15:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '15:00:00', '16:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '16:00:00', '17:00:00', 4, 0, 0),
        ('DC8ED0C9-880F-455F-912A-9494BFE69CFB', @DateCounter, '17:00:00', '18:00:00', 4, 0, 0);
    END;

    -- Branch 3 (Da Nang)
    IF NOT EXISTS (SELECT 1 FROM [dbo].[SlotInventory] WHERE [BranchId] = '93C68DFE-5207-4C70-AFDF-7080ECFA5DEB' AND [SlotDate] = @DateCounter)
    BEGIN
        INSERT INTO [dbo].[SlotInventory] ([BranchId], [SlotDate], [SlotStartTime], [SlotEndTime], [Capacity], [OnlineReservedCount], [WalkInReservedCount]) VALUES
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '08:00:00', '09:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '09:00:00', '10:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '10:00:00', '11:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '11:00:00', '12:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '13:00:00', '14:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '14:00:00', '15:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '15:00:00', '16:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '16:00:00', '17:00:00', 2, 0, 0),
        ('93C68DFE-5207-4C70-AFDF-7080ECFA5DEB', @DateCounter, '17:00:00', '18:00:00', 2, 0, 0);
    END;

    SET @DateCounter = DATEADD(DAY, 1, @DateCounter);
END;

/* ============================================================
   END OF SCRIPT
   ============================================================ */
