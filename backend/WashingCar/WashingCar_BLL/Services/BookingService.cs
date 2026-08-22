using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_BLL.Policies;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_Common.Helpers;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Booking;

namespace WashingCar_BLL.Services;

/// <summary>
/// Service trung tâm của hệ thống — vòng đời booking đầy đủ (quote → create → confirm → check-in → complete → close/cancel).
/// Inject 10 dependency: IBookingRepository, IVehicleRepository, IServiceCatalogRepository, IBranchRepository,
/// IUserRepository, IEmailService, ILoyaltyService, IVoucherRepository, IReviewRepository, IPaymentRepository.
/// </summary>
public class BookingService(
    IBookingRepository        bookingRepo,
    IVehicleRepository        vehicleRepo,
    IServiceCatalogRepository serviceCatalogRepo,
    IBranchRepository         branchRepo,
    IUserRepository           userRepo,
    IEmailService             emailService,
    ILoyaltyService           loyaltyService,
    IVoucherRepository        voucherRepo,
    IReviewRepository         reviewRepo,
    IPaymentRepository        paymentRepo,
    IVehicleBodyStyleCatalogRepository bodyStyleCatalogRepo,
    IVehicleBrandCatalogRepository brandCatalogRepo,
    ILogger<BookingService>   logger) : IBookingService
{
    // Slot lưu theo giờ địa phương; VN = UTC+7 (không DST). Xem WashingCar_Common.Helpers.VietnamTimeHelper.
    private const int VietnamUtcOffsetHours = VietnamTimeHelper.UtcOffsetHours;

    // Số ngày được đặt trước tối đa mặc định — hạng có benefit AdvanceBookingDays sẽ override giá trị này.
    private const int DefaultMaxAdvanceBookingDays = 3;
    private const int PendingBookingExpiryMinutes = 15;
    private const int PendingExpiryBatchSize = 100;

    // Booking limit áp dụng cho luồng Customer tạo booking online.
    private const int MaxPendingBookingsPerCustomer = 1;
    private const int MaxConfirmedBookingsPerCustomer = 3;

    private static readonly byte[] VehicleBlockingStatuses =
    [
        BookingStatus.Pending,
        BookingStatus.Confirmed,
        BookingStatus.CheckedIn,
        BookingStatus.InProgress,
    ];

    /// <summary>
    /// Normalize selection parent-child và trả trạng thái checkbox trước khi tính giá.
    /// Dùng cùng ExpandToLeafSelectionsAsync với quote/create nên không tạo ra
    /// một quy tắc selection thứ hai. Workflow này không đọc slot, không tính tiền
    /// và không ghi database.
    /// </summary>
    public async Task<ServiceSelectionPreviewDto> PreviewServiceSelectionAsync(
        ServiceSelectionPreviewRequest request,
        CancellationToken ct = default)
    {
        if (request is null)
            throw AppException.BadRequest(ValidationMessage.Booking.MustSelectAtLeastOneService);

        var normalized = await ExpandToLeafSelectionsAsync(request.Services, ct);
        var selectedLeafIds = normalized
            .Select(selection => selection.ServiceCatalogItemId)
            .ToHashSet();
        var roots = await serviceCatalogRepo.GetHierarchyAsync(includeInactive: false);
        var states = new List<ServiceSelectionStateDto>();

        foreach (var root in roots)
            AddSelectionStates(root, selectedLeafIds, states);

        return new ServiceSelectionPreviewDto
        {
            NormalizedLeafSelections = normalized,
            States = states,
            SelectedLeafCount = normalized.Count,
        };
    }

    /// <summary>Tính giá preview (dịch vụ + voucher + tier discount + redeem điểm) trước khi đặt — không ghi DB.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetSlotForReserveAsync → helper BuildLinesAsync (→ IServiceCatalogRepository.GetByIdAsync
    /// + IBranchRepository.GetBranchServiceAsync mỗi dòng) → helper ResolveAndValidateVoucherAsync
    /// (→ IVoucherRepository.GetUserVoucherByIdAsync/GetByCodeAsync/GetUserVoucherAsync)
    /// → ILoyaltyService.GetActiveTierBenefitsAsync → helper ResolveRedeemAsync (→ ILoyaltyService.GetCurrentPointsAsync).
    /// </remarks>
    public async Task<BookingQuoteDto> QuoteAsync(Guid userId, BookingQuoteRequest request, CancellationToken ct = default)
    {
        var slot = await bookingRepo.GetSlotForReserveAsync(request.SlotInventoryId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Slot.NotFound);

        Vehicle? vehicle = null;
        if (request.VehicleId.HasValue)
        {
            vehicle = await vehicleRepo.GetByIdAsync(request.VehicleId.Value, userId)
                ?? throw AppException.NotFound(ValidationMessage.Booking.MyVehicleNotFound);
        }

        var lines = await BuildLinesAsync(slot.BranchId, request.Services, ct);
        var serviceSubtotal = lines.Sum(line => line.LineTotal);
        var vehicleSurcharge = vehicle is null
            ? (Condition: VehicleCondition.Standard, Rate: 0m, Amount: 0m)
            : CalculateVehicleSurcharge(vehicle, serviceSubtotal);
        var subtotal = serviceSubtotal + vehicleSurcharge.Amount;
        var discount = 0m;

        if (request.UserVoucherId.HasValue || !string.IsNullOrWhiteSpace(request.VoucherCode))
        {
            var userVoucher = await ResolveAndValidateVoucherAsync(userId, request.UserVoucherId, request.VoucherCode, slot.BranchId, subtotal, ct);
            discount = CalculateDiscount(userVoucher.Voucher, subtotal);
        }

        var tierBenefits = await loyaltyService.GetActiveTierBenefitsAsync(userId, ct);
        discount = Math.Min(discount + subtotal * ResolveTierDiscountPercent(tierBenefits) / 100m, subtotal);

        var afterVoucher     = subtotal - discount;
        var (redeemPoints, redeemDiscount) = await ResolveRedeemAsync(
            userId, request.RedeemMode, request.RedeemPoints, afterVoucher, ct);

        return new BookingQuoteDto
        {
            Lines                   = [.. lines.Select(line => line.ToDto())],
            ServiceSubtotal          = serviceSubtotal,
            VehicleCondition         = vehicle is null
                ? null
                : VehicleConditionPolicy.GetCondition(vehicle.ManufactureYear).ToString(),
            VehicleSurchargeRate     = vehicleSurcharge.Rate,
            VehicleSurchargeAmount   = vehicleSurcharge.Amount,
            Subtotal                 = subtotal,
            DiscountAmount           = discount + redeemDiscount,
            FinalAmount              = afterVoucher - redeemDiscount,
            TotalDurationMinutes     = lines.Sum(line => line.DurationMinutes * line.Quantity),
        };
    }

    /// <summary>Tạo booking Online (Pending — chờ thanh toán) cho Customer đang đăng nhập.</summary>
    /// <remarks>
    /// Gọi: IVehicleRepository.GetByIdAsync → IBookingRepository.GetSlotForReserveAsync
    /// → ILoyaltyService.GetActiveTierBenefitsAsync → BuildLinesAsync → ResolveAndValidateVoucherAsync → ResolveRedeemAsync
    /// → IVoucherRepository.AddUserVoucherAsync (nếu voucher mới) → IBookingRepository.AddAsync + SaveChangesAsync
    /// (bắt DbUpdateConcurrencyException — RowVersion trên SlotInventory) → ILoyaltyService.RedeemForBookingAsync (best-effort)
    /// → IEmailService.SendBookingConfirmationEmailAsync (best-effort, qua helper TrySendConfirmationEmailAsync).
    /// </remarks>
    public async Task<BookingDto> CreateAsync(Guid userId, CreateBookingRequest request, CancellationToken ct = default)
    {
        // 1. Xe phải thuộc về khách đang đăng nhập
        var vehicle = await vehicleRepo.GetByIdAsync(request.VehicleId, userId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.MyVehicleNotFound);

        // Khóa User + Vehicle trong cùng transaction để serialize count/overlap rồi mới insert.
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireUserLockAsync(userId, ct);
        await bookingRepo.AcquireVehicleLockAsync(vehicle.VehicleId, ct);

        // 2. Slot (tracked để giữ chỗ) — branch lấy từ slot
        var slot = await bookingRepo.GetSlotForReserveAsync(request.SlotInventoryId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Slot.NotFound);

        if (slot.Capacity - (slot.OnlineReservedCount + slot.WalkInReservedCount) <= 0)
            throw AppException.Conflict(ValidationMessage.Booking.SlotFull);

        if (slot.SlotDate.ToDateTime(slot.SlotStartTime) <= DateTime.UtcNow.AddHours(VietnamUtcOffsetHours))
            throw AppException.BadRequest(ValidationMessage.Booking.SlotTimePast);

        var tierBenefits = await loyaltyService.GetActiveTierBenefitsAsync(userId, ct);
        ValidateAdvanceBookingWindow(slot.SlotDate, tierBenefits);

        // 3. Booking limit của Customer và không cho cùng xe trùng thời gian.
        await ValidateOnlineBookingLimitsAsync(userId, vehicle.VehicleId, slot, ct);

        // 4. Dựng booking lines (snapshot giá) và phụ thu theo tình trạng xe.
        var lines = await BuildLinesAsync(slot.BranchId, request.Services, ct);
        var serviceSubtotal = lines.Sum(line => line.LineTotal);
        var vehicleSurcharge = CalculateVehicleSurcharge(vehicle, serviceSubtotal);
        var subtotal = serviceSubtotal + vehicleSurcharge.Amount;
        var discount = 0m;
        UserVoucher? userVoucher = null;

        if (request.UserVoucherId.HasValue || !string.IsNullOrWhiteSpace(request.VoucherCode))
        {
            userVoucher = await ResolveAndValidateVoucherAsync(userId, request.UserVoucherId, request.VoucherCode, slot.BranchId, subtotal, ct);
            discount = CalculateDiscount(userVoucher.Voucher, subtotal);
        }

        discount = Math.Min(discount + subtotal * ResolveTierDiscountPercent(tierBenefits) / 100m, subtotal);

        var afterVoucher     = subtotal - discount;
        var (redeemPoints, redeemDiscount) = await ResolveRedeemAsync(
            userId, request.RedeemMode, request.RedeemPoints, afterVoucher, ct);
        var totalDiscount    = discount + redeemDiscount;
        var final            = subtotal - totalDiscount;

        // 5. Sinh mã booking + QR token duy nhất
        var code = await GenerateUniqueCodeAsync(ct);
        var qr   = await GenerateUniqueQrAsync(ct);

        var booking = new Booking
        {
            UserId                = userId,
            VehicleId             = vehicle.VehicleId,
            SlotInventoryId       = slot.SlotInventoryId,
            BranchId              = slot.BranchId,
            UserVoucherId         = userVoucher?.UserVoucherId,
            BookingCode           = code,
            CheckInQrCode         = qr,
            BookingType           = BookingType.Online,
            BookingStatus         = BookingStatus.Pending,
            BookingSubtotal       = subtotal,
            VehicleConditionAtBooking = (byte)vehicleSurcharge.Condition,
            VehicleSurchargeRate  = vehicleSurcharge.Rate,
            VehicleSurchargeAmount = vehicleSurcharge.Amount,
            BookingDiscountAmount = totalDiscount,
            BookingFinalAmount    = final,
            EarnedPoints          = 0,
            RedeemedPoints        = redeemPoints,
            CreatedAtUtc          = DateTime.UtcNow,
            BookingLines          = lines,
        };

        // 6. Giữ chỗ slot + tạo booking trong 1 SaveChanges (concurrency qua RowVersion)
        slot.OnlineReservedCount++;

        if (userVoucher is not null)
        {
            // Gỡ liên kết voucher khỏi bất kỳ booking cũ nào đã bị Hủy để tránh vi phạm UNIQUE index
            var oldBooking = await bookingRepo.GetTrackedByUserVoucherIdAsync(userVoucher.UserVoucherId, ct);
            if (oldBooking is not null && oldBooking.BookingStatus == BookingStatus.Cancelled)
            {
                oldBooking.UserVoucherId = null;
            }

            var exists = await voucherRepo.GetUserVoucherByIdAsync(userVoucher.UserVoucherId, ct) != null;
            if (!exists)
            {
                await voucherRepo.AddUserVoucherAsync(userVoucher, ct);
                if (userVoucher.Voucher is not null)
                {
                    userVoucher.Voucher.UsedCount++;
                }
            }

            userVoucher.VoucherStatus = UserVoucherStatus.Used;
            userVoucher.UsedAtUtc = DateTime.UtcNow;
        }

        await bookingRepo.AddAsync(booking, ct);
        try
        {
            await bookingRepo.SaveChangesAsync(ct);

            // Redeem trong cùng transaction với booking để expiry không chạy giữa hai side effect.
            if (redeemPoints > 0)
            {
                try { await loyaltyService.RedeemForBookingAsync(userId, redeemPoints, booking.BookingId, ct); }
                catch (Exception ex)
                {
                    booking.RedeemedPoints = 0;
                    logger.LogWarning(ex, "Trừ điểm loyalty cho booking {Code} thất bại", code);
                }
            }

            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(ct);
            throw AppException.Conflict(ValidationMessage.Booking.SlotJustFilled);
        }

        // 8. Email xác nhận — best-effort, lỗi không rollback booking
        await TrySendConfirmationEmailAsync(userId, booking, slot);

        booking.SlotInventory = slot;
        if (userVoucher is not null)
        {
            booking.UserVoucher = userVoucher;
        }

        logger.LogInformation("Created booking {Code} for user {UserId} on slot {SlotId}",
            code, userId, slot.SlotInventoryId);
        return booking.ToDto();
    }

    /// <summary>Staff tạo booking tại quầy cho khách walk-in — tạo thẳng CheckedIn (bỏ qua check-in riêng).</summary>
    /// <remarks>
    /// Gọi: IUserRepository.GetByIdAsync (khách) → IBookingRepository.GetSlotForReserveAsync → BuildLinesAsync
    /// → ResolveAndValidateVoucherAsync → ILoyaltyService.GetActiveTierBenefitsAsync → ResolveRedeemAsync
    /// → helper ResolveWalkInVehicleAsync (→ IVehicleRepository.GetByIdAsync/ExistsLicensePlateAsync/CreateAsync)
    /// → IBookingRepository.AddAsync + SaveChangesAsync → ILoyaltyService.RedeemForBookingAsync (best-effort)
    /// → TrySendConfirmationEmailAsync (best-effort).
    /// </remarks>
    public async Task<BookingDto> CreateWalkInAsync(
        Guid staffId, CreateWalkInBookingRequest request, CancellationToken ct = default)
    {
        // 1. Khách (staff đặt hộ) phải tồn tại & là Customer
        var customer = await userRepo.GetByIdAsync(request.CustomerId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.CustomerNotFound);
        if (customer.Role != UserRole.Customer)
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyForCustomerRole);

        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireUserLockAsync(customer.UserId, ct);

        // 2. Slot (tracked để giữ chỗ) — branch lấy từ slot
        var slot = await bookingRepo.GetSlotForReserveAsync(request.SlotInventoryId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Slot.NotFound);

        if (slot.Capacity - (slot.OnlineReservedCount + slot.WalkInReservedCount) <= 0)
            throw AppException.Conflict(ValidationMessage.Booking.SlotFull);

        if (slot.SlotDate.ToDateTime(slot.SlotStartTime) <= DateTime.UtcNow.AddHours(VietnamUtcOffsetHours))
            throw AppException.BadRequest(ValidationMessage.Booking.SlotTimePast);

        // 3. Dựng booking lines trước để validate dịch vụ, sau đó resolve xe và phụ thu.
        var lines = await BuildLinesAsync(slot.BranchId, request.Services, ct);
        var serviceSubtotal = lines.Sum(line => line.LineTotal);

        // 4. Xe của khách: chọn xe có sẵn hoặc tạo mới ad-hoc sau khi đã validate dịch vụ.
        var vehicle = await ResolveWalkInVehicleAsync(customer.UserId, request);
        await bookingRepo.AcquireVehicleLockAsync(vehicle.VehicleId, ct);
        await EnsureVehicleSlotNotOverlappingAsync(vehicle.VehicleId, slot, ct);

        var vehicleSurcharge = CalculateVehicleSurcharge(vehicle, serviceSubtotal);
        var subtotal = serviceSubtotal + vehicleSurcharge.Amount;
        var discount = 0m;
        UserVoucher? userVoucher = null;

        if (request.UserVoucherId.HasValue || !string.IsNullOrWhiteSpace(request.VoucherCode))
        {
            userVoucher = await ResolveAndValidateVoucherAsync(customer.UserId, request.UserVoucherId, request.VoucherCode, slot.BranchId, subtotal, ct);
            discount = CalculateDiscount(userVoucher.Voucher, subtotal);
        }

        var tierBenefits = await loyaltyService.GetActiveTierBenefitsAsync(customer.UserId, ct);
        discount = Math.Min(discount + subtotal * ResolveTierDiscountPercent(tierBenefits) / 100m, subtotal);

        var afterVoucher     = subtotal - discount;
        var (redeemPoints, redeemDiscount) = await ResolveRedeemAsync(
            customer.UserId, request.RedeemMode, request.RedeemPoints, afterVoucher, ct);
        var totalDiscount    = discount + redeemDiscount;
        var final            = subtotal - totalDiscount;

        // 5. Sinh mã booking + QR token duy nhất
        var code = await GenerateUniqueCodeAsync(ct);
        var qr   = await GenerateUniqueQrAsync(ct);

        var booking = new Booking
        {
            UserId                = customer.UserId,
            VehicleId             = vehicle.VehicleId,
            SlotInventoryId       = slot.SlotInventoryId,
            BranchId              = slot.BranchId,
            UserVoucherId         = userVoucher?.UserVoucherId,
            BookingCode           = code,
            CheckInQrCode         = qr,
            BookingType           = BookingType.WalkIn,
            BookingStatus         = BookingStatus.CheckedIn,
            CheckInAtUtc          = DateTime.UtcNow,
            CheckedInByUserId     = staffId,
            BookingSubtotal       = subtotal,
            VehicleConditionAtBooking = (byte)vehicleSurcharge.Condition,
            VehicleSurchargeRate  = vehicleSurcharge.Rate,
            VehicleSurchargeAmount = vehicleSurcharge.Amount,
            BookingDiscountAmount = totalDiscount,
            BookingFinalAmount    = final,
            EarnedPoints          = 0,
            RedeemedPoints        = redeemPoints,
            CreatedAtUtc          = DateTime.UtcNow,
            BookingLines          = lines,
        };

        // 6. Giữ chỗ slot (đếm walk-in) + tạo booking trong 1 SaveChanges
        slot.WalkInReservedCount++;

        if (userVoucher is not null)
        {
            // Gỡ liên kết voucher khỏi bất kỳ booking cũ nào đã bị Hủy để tránh vi phạm UNIQUE index
            var oldBooking = await bookingRepo.GetTrackedByUserVoucherIdAsync(userVoucher.UserVoucherId, ct);
            if (oldBooking is not null && oldBooking.BookingStatus == BookingStatus.Cancelled)
            {
                oldBooking.UserVoucherId = null;
            }

            var exists = await voucherRepo.GetUserVoucherByIdAsync(userVoucher.UserVoucherId, ct) != null;
            if (!exists)
            {
                await voucherRepo.AddUserVoucherAsync(userVoucher, ct);
                if (userVoucher.Voucher is not null)
                {
                    userVoucher.Voucher.UsedCount++;
                }
            }

            userVoucher.VoucherStatus = UserVoucherStatus.Used;
            userVoucher.UsedAtUtc = DateTime.UtcNow;
        }

        await bookingRepo.AddAsync(booking, ct);
        try
        {
            await bookingRepo.SaveChangesAsync(ct);

            // Redeem trong cùng transaction với booking để expiry không chạy giữa hai side effect.
            if (redeemPoints > 0)
            {
                try { await loyaltyService.RedeemForBookingAsync(customer.UserId, redeemPoints, booking.BookingId, ct); }
                catch (Exception ex)
                {
                    booking.RedeemedPoints = 0;
                    logger.LogWarning(ex, "Trừ điểm loyalty cho walk-in booking {Code} thất bại", code);
                }
            }

            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transaction.RollbackAsync(ct);
            throw AppException.Conflict(ValidationMessage.Booking.SlotJustFilled);
        }

        // 8. Email xác nhận — best-effort (khách guest có thể không có email)
        await TrySendConfirmationEmailAsync(customer.UserId, booking, slot);

        booking.SlotInventory = slot;
        logger.LogInformation("Staff {StaffId} tạo walk-in booking {Code} cho khách {CustomerId} slot {SlotId}",
            staffId, code, customer.UserId, slot.SlotInventoryId);
        return booking.ToDto();
    }

    /// <summary>Hook cho module Payment: Pending → Confirmed sau khi đã thu cọc/đủ.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.
    /// Được gọi qua 2 đường: BookingController.Confirm và PaymentService (Service→Service, helper TryConfirmBookingAsync).
    /// </remarks>
    public async Task<BookingDto> MarkConfirmedAsync(Guid bookingId, CancellationToken ct = default)
    {
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireBookingLockAsync(bookingId, ct);

        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (booking.BookingStatus != BookingStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyConfirmPending);

        booking.BookingStatus = BookingStatus.Confirmed;
        await bookingRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        logger.LogInformation("Booking {Id} confirmed (đã thu tiền)", bookingId);
        return booking.ToDto();
    }

    /// <remarks>Gọi: IBookingRepository.GetMyBookingsPagedAsync.</remarks>
    public async Task<PagedResult<BookingListItemDto>> GetMyBookingsAsync(
        Guid userId, BookingQuery query, CancellationToken ct = default)
    {
        var (items, total) = await bookingRepo.GetMyBookingsPagedAsync(userId, query, ct);
        return new PagedResult<BookingListItemDto>
        {
            Items      = [.. items.Select(b => b.ToListItemDto())],
            TotalCount = total,
            PageNumber = query.Page,
            PageSize   = query.PageSize,
        };
    }

    /// <remarks>Gọi: IBookingRepository.GetDetailAsync.</remarks>
    public async Task<BookingDto> GetByIdAsync(
        Guid currentUserId, bool isPrivileged, Guid bookingId, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetDetailAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (!isPrivileged && booking.UserId != currentUserId)
            throw AppException.Forbidden(ValidationMessage.Booking.ForbiddenView);

        return booking.ToDto();
    }

    /// <remarks>Gọi: helper ResolveBranchIdAsync (→ IUserRepository.GetByIdAsync) → IBookingRepository.GetQueuePagedAsync.</remarks>
    public async Task<PagedResult<BookingListItemDto>> GetQueueAsync(
        Guid currentUserId, BookingQuery query, CancellationToken ct = default)
    {
        var branchId = await ResolveBranchIdAsync(currentUserId, query.BranchId);

        // Mặc định: hàng đợi hôm nay nếu không lọc ngày
        if (query.FromDate is null && query.ToDate is null)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            query.FromDate = today;
            query.ToDate   = today;
        }

        var (items, total) = await bookingRepo.GetQueuePagedAsync(branchId, query, ct);
        return new PagedResult<BookingListItemDto>
        {
            Items      = [.. items.Select(b => b.ToListItemDto())],
            TotalCount = total,
            PageNumber = query.Page,
            PageSize   = query.PageSize,
        };
    }

    /// <summary>Chỉ cho phép CheckedIn → InProgress qua endpoint này — mọi trạng thái có side-effect dùng endpoint riêng.</summary>
    /// <remarks>Gọi: IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync (bắt DbUpdateConcurrencyException).</remarks>
    public async Task<BookingDto> UpdateStatusAsync(Guid bookingId, byte newStatus, Guid staffId, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        // Chỉ cho phép CheckedIn → InProgress qua endpoint này.
        // Tất cả trạng thái có side-effect (payment, loyalty, check-in…) phải dùng endpoint riêng.
        if (newStatus != BookingStatus.InProgress)
            throw AppException.BadRequest(ValidationMessage.Booking.StatusEndpointRestricted);

        var current = booking.BookingStatus;
        if (!IsAllowedTransition(current, newStatus))
            throw AppException.BadRequest(ValidationMessage.Booking.InvalidTransition(current, newStatus));

        booking.BookingStatus = newStatus;

        // Self-claim: chỉ gán nếu chưa có ai được gán trước (không ghi đè assign thủ công của Manager).
        if (booking.AssignedStaffId is null)
        {
            booking.AssignedStaffId = staffId;
            booking.AssignedAtUtc = DateTime.UtcNow;
        }

        try
        {
            await bookingRepo.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw AppException.Conflict(ValidationMessage.Booking.ConcurrentUpdateConflict);
        }

        logger.LogInformation("Booking {Id} status {From} → {To}; assigned staff {StaffId}",
            bookingId, current, newStatus, booking.AssignedStaffId);
        return booking.ToDto();
    }

    /// <summary>Check-in bằng mã QR hoặc mã booking — Confirmed → CheckedIn.</summary>
    /// <remarks>Gọi: IBookingRepository.GetTrackedByQrAsync/GetTrackedByCodeAsync → SaveChangesAsync.</remarks>
    public async Task<BookingDto> CheckInAsync(Guid staffId, CheckInRequest request, CancellationToken ct = default)
    {
        Booking? booking;
        if (!string.IsNullOrWhiteSpace(request.CheckInQrCode))
            booking = await bookingRepo.GetTrackedByQrAsync(request.CheckInQrCode.Trim(), ct);
        else if (!string.IsNullOrWhiteSpace(request.BookingCode))
            booking = await bookingRepo.GetTrackedByCodeAsync(request.BookingCode.Trim(), ct);
        else
            throw AppException.BadRequest(ValidationMessage.Booking.CheckInRequiresCode);

        if (booking is null)
            throw AppException.NotFound(ValidationMessage.Booking.InvalidCheckInCode);

        if (booking.BookingStatus != BookingStatus.Confirmed)
            throw AppException.BadRequest(ValidationMessage.Booking.CheckInRequiresConfirmed);

        booking.BookingStatus     = BookingStatus.CheckedIn;
        booking.CheckInAtUtc      = DateTime.UtcNow;
        booking.CheckedInByUserId = staffId;
        await bookingRepo.SaveChangesAsync(ct);

        logger.LogInformation("Booking {Code} checked in by staff {StaffId}", booking.BookingCode, staffId);
        return booking.ToDto();
    }

    /// <summary>Quét QR để XEM thông tin booking trước khi check-in (read-only, không đổi trạng thái).</summary>
    /// <remarks>Gọi: IBookingRepository.GetDetailByQrAsync.</remarks>
    public async Task<BookingDto> LookupByQrAsync(string qrToken, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetDetailByQrAsync(qrToken.Trim(), ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.InvalidQr);
        return booking.ToDto();
    }

    /// <summary>Thêm dịch vụ phát sinh khi đang rửa — tính lại tổng tiền.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → helper BuildLineAsync (→ IServiceCatalogRepository.GetByIdAsync
    /// + IBranchRepository.GetBranchServiceAsync) → SaveChangesAsync.
    /// </remarks>
    public async Task<BookingDto> AddServiceLineAsync(
        Guid bookingId, AddServiceLineRequest request, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);
        EnsureEditable(booking);

        var line = await BuildLineAsync(booking.BranchId, request.ServiceCatalogItemId, request.Quantity, ct);
        booking.BookingLines.Add(line);
        Recalculate(booking);

        await bookingRepo.SaveChangesAsync(ct);
        logger.LogInformation("Thêm dịch vụ {Svc} vào booking {Id}; tổng mới {Total}",
            request.ServiceCatalogItemId, bookingId, booking.BookingFinalAmount);
        return booking.ToDto();
    }

    /// <summary>Sửa số lượng 1 dòng dịch vụ — tính lại tổng tiền.</summary>
    /// <remarks>Gọi: IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.</remarks>
    public async Task<BookingDto> UpdateLineAsync(
        Guid bookingId, Guid lineId, UpdateBookingLineRequest request, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);
        EnsureEditable(booking);

        var line = booking.BookingLines.FirstOrDefault(l => l.BookingLineId == lineId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.LineNotFound);

        var qty = request.Quantity < 1 ? (short)1 : request.Quantity;
        line.Quantity  = qty;
        line.LineTotal = line.UnitPrice * qty;
        Recalculate(booking);

        await bookingRepo.SaveChangesAsync(ct);
        return booking.ToDto();
    }

    /// <summary>Xoá 1 dòng dịch vụ — tính lại tổng tiền. Không xoá được dịch vụ cuối cùng.</summary>
    /// <remarks>Gọi: IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync (orphan deletion nhờ cascade FK).</remarks>
    public async Task<BookingDto> RemoveLineAsync(Guid bookingId, Guid lineId, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);
        EnsureEditable(booking);

        var line = booking.BookingLines.FirstOrDefault(l => l.BookingLineId == lineId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.LineNotFound);

        // Booking phải còn ít nhất 1 dịch vụ (đối xứng với BuildLinesAsync khi tạo)
        if (booking.BookingLines.Count <= 1)
            throw AppException.BadRequest(ValidationMessage.Booking.CannotRemoveLastLine);

        // FK BookingId required + cascade ⇒ remove khỏi collection tracked sẽ xoá row (orphan deletion)
        booking.BookingLines.Remove(line);
        Recalculate(booking);

        await bookingRepo.SaveChangesAsync(ct);
        logger.LogInformation("Xoá dịch vụ {LineId} khỏi booking {Id}; tổng mới {Total}",
            lineId, bookingId, booking.BookingFinalAmount);
        return booking.ToDto();
    }

    /// <summary>Hoàn tất rửa xe — CheckedIn/InProgress → Completed.</summary>
    /// <remarks>Gọi: IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync (bắt DbUpdateConcurrencyException).</remarks>
    public async Task<BookingDto> CompleteAsync(Guid bookingId, Guid staffId, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (booking.BookingStatus is not (BookingStatus.CheckedIn or BookingStatus.InProgress))
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyCompleteWhenCheckedInOrInProgress);

        // Lưới an toàn: nếu bỏ qua InProgress (vd WalkIn Complete thẳng), vẫn ghi nhận người rửa xe.
        if (booking.AssignedStaffId is null)
        {
            booking.AssignedStaffId = staffId;
            booking.AssignedAtUtc = DateTime.UtcNow;
        }

        booking.BookingStatus  = BookingStatus.Completed;
        booking.CompletedAtUtc = DateTime.UtcNow;

        try
        {
            await bookingRepo.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw AppException.Conflict(ValidationMessage.Booking.ConcurrentUpdateConflict);
        }

        logger.LogInformation("Booking {Code} completed by staff {StaffId}", booking.BookingCode, booking.AssignedStaffId);

        return booking.ToDto();
    }

    /// <summary>Manager/Admin gán lại nhân viên thực hiện rửa xe — ghi đè, khác self-claim chỉ set khi null.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → IReviewRepository.ExistsForBookingAsync
    /// → IUserRepository.GetByIdAsync (staff + manager) → SaveChangesAsync (bắt DbUpdateConcurrencyException).
    /// </remarks>
    public async Task<BookingDto> AssignStaffAsync(Guid bookingId, Guid managerId, Guid targetStaffId, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        // Whitelist rõ ràng: chỉ gán/sửa khi đã check-in trở đi (CheckedIn/InProgress/Completed/Closed).
        // Pending/Confirmed (chưa check-in, chưa chắc có rửa xe) và Cancelled/NoShow (không có wash) đều bị chặn.
        if (booking.BookingStatus is not (BookingStatus.CheckedIn or BookingStatus.InProgress
                                        or BookingStatus.Completed or BookingStatus.Closed))
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyAssignFromCheckedInOnward);

        if (booking.BookingStatus is BookingStatus.Completed or BookingStatus.Closed
            && await reviewRepo.ExistsForBookingAsync(bookingId))
            throw AppException.BadRequest(ValidationMessage.Booking.CannotReassignAfterReview);

        var targetStaff = await userRepo.GetByIdAsync(targetStaffId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.StaffNotFound);

        if (targetStaff.Role != UserRole.Staff)
            throw AppException.BadRequest(ValidationMessage.Booking.TargetMustBeStaffRole);

        if (!targetStaff.IsActive)
            throw AppException.BadRequest(ValidationMessage.Booking.StaffInactive);

        if (targetStaff.BranchId != booking.BranchId)
            throw AppException.BadRequest(ValidationMessage.Booking.StaffNotAtBranch);

        var manager = await userRepo.GetByIdAsync(managerId);
        if (manager?.Role == UserRole.Manager && manager.BranchId != booking.BranchId)
            throw AppException.Forbidden(ValidationMessage.Booking.ForbiddenAssignOtherBranch);

        // Reassign luôn ghi đè — khác self-claim (chỉ set khi null), vì đây chính là cơ chế sửa lại.
        booking.AssignedStaffId = targetStaffId;
        booking.AssignedAtUtc = DateTime.UtcNow;

        try
        {
            await bookingRepo.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw AppException.Conflict(ValidationMessage.Booking.ConcurrentUpdateConflict);
        }

        logger.LogInformation("Booking {Code} reassigned to staff {StaffId} by {ManagerId}",
            booking.BookingCode, targetStaffId, managerId);
        return booking.ToDto();
    }

    /// <summary>Đóng đơn sau khi hoàn tất — Completed → Closed, tích điểm loyalty (best-effort).</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → IPaymentRepository.HasCompletedFullPaymentAsync
    /// → ILoyaltyService.EarnFromBookingAsync (best-effort, +30% bonus nếu FullPayment) → SaveChangesAsync.
    /// Được gọi qua 2 đường: BookingController.Close và PaymentService (Service→Service, helper TryCloseBookingAsync).
    /// </remarks>
    public async Task<BookingDto> CloseAsync(Guid bookingId, CancellationToken ct = default)
    {
        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (booking.BookingStatus != BookingStatus.Completed)
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyCloseWhenCompleted);

        // Tích điểm loyalty (best-effort): không chặn việc đóng đơn nếu loyalty lỗi
        // Bonus +30% điểm nếu khách thanh toán 100% giá trị đơn trong 1 lần (PaymentType.FullPayment), không qua cọc
        try
        {
            var isFullPayment = await paymentRepo.HasCompletedFullPaymentAsync(booking.BookingId, ct);
            booking.EarnedPoints = await loyaltyService.EarnFromBookingAsync(
                booking.UserId, booking.BookingFinalAmount, booking.BookingId, isFullPayment, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Tích điểm loyalty cho booking {Code} thất bại", booking.BookingCode);
        }

        booking.BookingStatus = BookingStatus.Closed;
        await bookingRepo.SaveChangesAsync(ct);

        logger.LogInformation("Booking {Code} closed", booking.BookingCode);
        return booking.ToDto();
    }

    /// <summary>Huỷ đơn trước check-in — tính phí theo thời điểm hủy, nhả slot và ghi refund ledger nội bộ nếu có tiền đã thu.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → IPaymentRepository.GetTrackedPendingPaymentsAsync
    /// → IVoucherRepository.GetUserVoucherByIdAsync → IPaymentRepository.GetCompletedPaymentsForRefundAsync
    /// → tạo Refund rows → SaveChangesAsync → thông báo manager (best-effort).
    /// </remarks>
    public async Task<BookingDto> CancelAsync(
        Guid userId, bool isPrivileged, Guid bookingId, CancelBookingRequest? request, CancellationToken ct = default)
    {
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireBookingLockAsync(bookingId, ct);

        var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (!isPrivileged && booking.UserId != userId)
            throw AppException.Forbidden(ValidationMessage.Booking.ForbiddenCancel);

        if (booking.BookingStatus is not (BookingStatus.Pending or BookingStatus.Confirmed))
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyCancelWhenPendingOrConfirmed);

        var nowUtc = DateTime.UtcNow;
        var nowLocal = nowUtc.AddHours(VietnamUtcOffsetHours);
        var slotStartLocal = booking.SlotInventory.SlotDate
            .ToDateTime(booking.SlotInventory.SlotStartTime);
        var cancellation = CancellationPolicy.Evaluate(nowLocal, slotStartLocal);
        if (cancellation.IsAfterSlotStart)
            throw AppException.BadRequest(ValidationMessage.Booking.CancellationWindowClosed);

        // Nhả chỗ slot đã giữ (booking.SlotInventory đã được Include)
        var slot = booking.SlotInventory;
        if (slot is not null)
        {
            if (booking.BookingType == BookingType.WalkIn && slot.WalkInReservedCount > 0)
                slot.WalkInReservedCount--;
            else if (slot.OnlineReservedCount > 0)
                slot.OnlineReservedCount--;
        }

        // Hủy các payment Pending cùng transaction để callback gateway đến muộn không còn được áp dụng.
        var pendingPayments = await paymentRepo.GetTrackedPendingPaymentsAsync(bookingId, ct);
        foreach (var pendingPayment in pendingPayments)
            pendingPayment.PaymentStatus = PaymentStatus.Cancelled;

        // Hoàn trả voucher nếu có sử dụng
        if (booking.UserVoucherId.HasValue)
        {
            var userVoucher = await voucherRepo.GetUserVoucherByIdAsync(booking.UserVoucherId.Value, ct);
            if (userVoucher is not null)
            {
                userVoucher.VoucherStatus = UserVoucherStatus.Redeemed;
                userVoucher.UsedAtUtc = null;
            }
            booking.UserVoucherId = null; // Gỡ liên kết voucher khỏi booking cũ để tránh vi phạm ràng buộc UNIQUE khi đặt lại
        }

        // Tính trên tổng Payment Completed gốc; các Refund row bị loại khỏi nguồn tính tiền.
        var completedPayments = await paymentRepo.GetCompletedPaymentsForRefundAsync(bookingId, ct);
        var paidAmount = completedPayments.Sum(p => p.Amount);
        var cancellationFeeAmount = cancellation.CalculateFee(paidAmount);
        var refundAmount = Math.Max(0m, paidAmount - cancellationFeeAmount);

        // Refund là ledger nội bộ: mỗi row liên kết đúng payment gốc và không vượt số tiền gốc.
        // Việc tạo row nằm trong cùng transaction với việc chuyển Booking -> Cancelled.
        var refundRemaining = refundAmount;
        var refundReason = $"Hủy booking {booking.BookingCode}; phí hủy {cancellation.FeeRate:P0}";
        if (!string.IsNullOrWhiteSpace(request?.Reason))
            refundReason += $"; {request.Reason.Trim()}";
        if (refundReason.Length > 500)
            refundReason = refundReason[..500];

        foreach (var original in completedPayments)
        {
            if (refundRemaining <= 0) break;

            var refundedAmount = await paymentRepo.GetRefundedAmountAsync(original.PaymentId, ct);
            var available = Math.Max(0m, original.Amount - refundedAmount);
            var amountForThisPayment = Math.Min(refundRemaining, available);
            if (amountForThisPayment <= 0) continue;

            await paymentRepo.AddAsync(new Payment
            {
                BookingId = booking.BookingId,
                PaymentType = PaymentType.Refund,
                PaymentMethod = original.PaymentMethod,
                PaymentStatus = PaymentStatus.Completed,
                Amount = amountForThisPayment,
                TransactionCode = $"REF-{booking.BookingCode}-{original.PaymentId:N}",
                PaidAtUtc = nowUtc,
                OriginalPaymentId = original.PaymentId,
                RefundReason = refundReason,
                RefundedByUserId = userId,
                CreatedAtUtc = nowUtc,
            }, ct);

            refundRemaining -= amountForThisPayment;
        }

        if (refundRemaining > 0)
            throw AppException.BadRequest(ValidationMessage.Payment.RefundAmountInvalid);

        booking.BookingStatus = BookingStatus.Cancelled;
        await bookingRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        if (paidAmount > 0)
        {
            try
            {
                var branch = await branchRepo.GetByIdAsync(booking.BranchId, ct);
                if (branch?.Manager != null && !string.IsNullOrWhiteSpace(branch.Manager.Email))
                {
                    // Email contract cũ có tham số pointsEarned; hủy/refund không được cộng điểm nên truyền 0.
                    await emailService.SendManagerBookingCancelledNotificationEmailAsync(
                        branch.Manager.Email, branch.Manager.FullName, booking.BookingCode, paidAmount, 0);
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Gửi thông báo hủy booking {Code} cho manager thất bại", booking.BookingCode);
            }
        }

        logger.LogInformation(
            "Booking {Code} cancelled; paid={PaidAmount}, fee={FeeAmount}, refund={RefundAmount}, reason={Reason}",
            booking.BookingCode, paidAmount, cancellationFeeAmount, refundAmount, request?.Reason ?? "(không)");

        var result = booking.ToDto();
        result.PaidAmountAtCancellation = paidAmount;
        result.CancellationFeeRate = cancellation.FeeRate;
        result.CancellationFeeAmount = cancellationFeeAmount;
        result.RefundAmount = refundAmount;
        return result;
    }

    /// <summary>Job nền (BookingReminderBackgroundService) — gửi email nhắc lịch cho booking Confirmed sắp tới trong 1h.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetRemindableAsync → IEmailService.SendBookingReminderEmailAsync (loop, best-effort mỗi item)
    /// → SaveChangesAsync (đánh dấu ReminderSentAtUtc). Không qua Controller — chạy tự động theo lịch.
    /// </remarks>
    public async Task<int> SendDueRemindersAsync(CancellationToken ct = default)
    {
        var nowUtc     = DateTime.UtcNow;
        var nowLocal   = nowUtc.AddHours(VietnamUtcOffsetHours);
        var windowEnd  = nowLocal.AddHours(1);
        var localToday = DateOnly.FromDateTime(nowLocal);

        // Lấy ứng viên hôm nay + ngày mai (cửa sổ 1h có thể vắt qua nửa đêm)
        var candidates = await bookingRepo.GetRemindableAsync(localToday, localToday.AddDays(1), ct);

        var sent = 0;
        foreach (var b in candidates)
        {
            var slotLocal = b.SlotInventory.SlotDate.ToDateTime(b.SlotInventory.SlotStartTime);
            if (slotLocal <= nowLocal || slotLocal > windowEnd)
                continue; // chưa tới cửa sổ 1h, hoặc đã qua giờ bắt đầu

            if (string.IsNullOrWhiteSpace(b.User?.Email))
                continue; // khách không có email → bỏ qua (rời cửa sổ sẽ tự loại)

            try
            {
                await emailService.SendBookingReminderEmailAsync(
                    b.User.Email, b.User.FullName, b.BookingCode,
                    b.SlotInventory.SlotDate, b.SlotInventory.SlotStartTime, b.SlotInventory.SlotEndTime,
                    b.Branch?.Name);
                b.ReminderSentAtUtc = nowUtc;   // đánh dấu để không gửi lại
                sent++;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Gửi email nhắc lịch cho booking {Code} thất bại", b.BookingCode);
            }
        }

        if (sent > 0)
            await bookingRepo.SaveChangesAsync(ct);

        return sent;
    }

    /// <summary>
    /// Tự động hủy Pending booking đã quá 15 phút kể từ CreatedAtUtc.
    /// Chỉ xử lý booking không có payment Pending/Completed để không tranh chấp callback/tiền đã thu.
    /// </summary>
    public async Task<int> ExpirePendingBookingsAsync(CancellationToken ct = default)
    {
        var nowUtc = DateTime.UtcNow;
        var cutoffUtc = nowUtc.AddMinutes(-PendingBookingExpiryMinutes);
        var candidates = await bookingRepo.GetExpiredPendingBookingIdsAsync(
            cutoffUtc, PendingExpiryBatchSize, ct);
        var expired = 0;

        foreach (var bookingId in candidates)
        {
            try
            {
                await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
                await bookingRepo.AcquireBookingLockAsync(bookingId, ct);

                var booking = await bookingRepo.GetTrackedByIdAsync(bookingId, ct);
                if (booking is null
                    || booking.BookingStatus != BookingStatus.Pending
                    || booking.CreatedAtUtc > cutoffUtc)
                {
                    await transaction.RollbackAsync(ct);
                    continue;
                }

                if (await paymentRepo.HasPendingOrCompletedPaymentAsync(bookingId, ct))
                {
                    await transaction.RollbackAsync(ct);
                    continue;
                }

                var slot = booking.SlotInventory;
                if (slot is not null)
                {
                    if (booking.BookingType == BookingType.WalkIn && slot.WalkInReservedCount > 0)
                        slot.WalkInReservedCount--;
                    else if (slot.OnlineReservedCount > 0)
                        slot.OnlineReservedCount--;
                }

                if (booking.UserVoucherId.HasValue)
                {
                    var userVoucher = await voucherRepo.GetUserVoucherByIdAsync(booking.UserVoucherId.Value, ct);
                    if (userVoucher is not null && userVoucher.VoucherStatus == UserVoucherStatus.Used)
                    {
                        userVoucher.VoucherStatus = UserVoucherStatus.Redeemed;
                        userVoucher.UsedAtUtc = null;
                    }
                    booking.UserVoucherId = null;
                }

                if (booking.RedeemedPoints > 0)
                {
                    await loyaltyService.ReleaseRedeemedPointsForBookingAsync(
                        booking.UserId, booking.BookingId, ct);
                    booking.RedeemedPoints = 0;
                }

                booking.BookingStatus = BookingStatus.Cancelled;
                await bookingRepo.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
                expired++;
            }
            catch (DbUpdateConcurrencyException ex)
            {
                logger.LogWarning(ex, "Pending expiry gặp concurrency conflict ở booking {BookingId}", bookingId);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Không thể expire Pending booking {BookingId}", bookingId);
            }
        }

        return expired;
    }

    // ─── Customer Support tại quầy (Staff đặt hộ khách walk-in) ───────────────
    // "Customer" = User có Role=Customer (không có entity riêng); dùng chung repo của slice.

    /// <summary>Tra cứu khách theo SĐT (kèm danh sách xe). Trả null nếu chưa có.</summary>
    /// <remarks>Gọi: IUserRepository.GetByPhoneAsync → IVehicleRepository.GetByUserIdAsync.</remarks>
    public async Task<CustomerLookupDto?> LookupCustomerByPhoneAsync(string phone, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(phone))
            throw AppException.BadRequest(ValidationMessage.Booking.PhoneRequired);

        var user = await userRepo.GetByPhoneAsync(phone.Trim());
        if (user is null || user.Role != UserRole.Customer)
            return null;

        var vehicles = await vehicleRepo.GetByUserIdAsync(user.UserId);
        return user.ToCustomerLookupDto(vehicles);
    }

    /// <summary>Đăng ký khách vãng lai (guest, không mật khẩu). Nếu SĐT đã tồn tại thì trả về khách cũ.</summary>
    /// <remarks>Gọi: IUserRepository.GetByPhoneAsync/GetByEmailAsync (check trùng) → CreateAsync.</remarks>
    public async Task<CustomerLookupDto> RegisterWalkInCustomerAsync(
        RegisterWalkInCustomerRequest request, CancellationToken ct = default)
    {
        var phone = string.IsNullOrWhiteSpace(request.PhoneNumber) ? null : request.PhoneNumber.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email)       ? null : request.Email.Trim();

        // Tái dùng khách cũ nếu SĐT đã tồn tại (UQ_User_PhoneNumber là unique toàn cục)
        if (phone is not null)
        {
            var existing = await userRepo.GetByPhoneAsync(phone);
            if (existing is not null)
            {
                if (existing.Role != UserRole.Customer)
                    throw AppException.Conflict(ValidationMessage.Common.PhoneInUse);

                logger.LogInformation("Walk-in dùng lại khách cũ {UserId} theo SĐT", existing.UserId);
                var existingVehicles = await vehicleRepo.GetByUserIdAsync(existing.UserId);
                return existing.ToCustomerLookupDto(existingVehicles);
            }
        }

        if (email is not null && await userRepo.GetByEmailAsync(email) is not null)
            throw AppException.Conflict(ValidationMessage.Common.EmailInUse);

        var user = new User
        {
            UserId       = Guid.NewGuid(),
            FullName     = request.FullName.Trim(),
            PhoneNumber  = phone,
            Email        = email,
            Role         = UserRole.Customer,
            IsGuest      = true,
            IsActive     = true,
            IsDeleted    = false,
            PasswordHash = null,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion   = [],
        };

        await userRepo.CreateAsync(user);
        logger.LogInformation("Đã đăng ký khách walk-in {UserId} (guest)", user.UserId);
        return user.ToCustomerLookupDto([]);
    }

    /// <remarks>Gọi: IUserRepository.GetByIdAsync → IBookingRepository.GetMyBookingsPagedAsync.</remarks>
    public async Task<PagedResult<BookingListItemDto>> GetCustomerBookingsAsync(
        Guid customerId, BookingQuery query, CancellationToken ct = default)
    {
        var customer = await userRepo.GetByIdAsync(customerId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.CustomerNotFound);

        var (items, total) = await bookingRepo.GetMyBookingsPagedAsync(customer.UserId, query, ct);
        return new PagedResult<BookingListItemDto>
        {
            Items      = [.. items.Select(b => b.ToListItemDto())],
            TotalCount = total,
            PageNumber = query.Page,
            PageSize   = query.PageSize,
        };
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private async Task ValidateOnlineBookingLimitsAsync(
        Guid userId,
        Guid vehicleId,
        SlotInventory slot,
        CancellationToken ct)
    {
        var pendingCount = await bookingRepo.CountByUserAndStatusesAsync(
            userId,
            [BookingStatus.Pending],
            ct);
        if (pendingCount >= MaxPendingBookingsPerCustomer)
            throw AppException.Conflict(ValidationMessage.Booking.TooManyPendingBookings);

        var confirmedCount = await bookingRepo.CountByUserAndStatusesAsync(
            userId,
            [BookingStatus.Confirmed],
            ct);
        if (confirmedCount >= MaxConfirmedBookingsPerCustomer)
            throw AppException.Conflict(ValidationMessage.Booking.TooManyConfirmedBookings);

        await EnsureVehicleSlotNotOverlappingAsync(vehicleId, slot, ct);
    }

    private async Task EnsureVehicleSlotNotOverlappingAsync(
        Guid vehicleId,
        SlotInventory slot,
        CancellationToken ct)
    {
        var overlaps = await bookingRepo.HasVehicleOverlapAsync(
            vehicleId,
            slot.SlotDate,
            slot.SlotStartTime,
            slot.SlotEndTime,
            VehicleBlockingStatuses,
            excludingBookingId: null,
            ct: ct);

        if (overlaps)
            throw AppException.Conflict(ValidationMessage.Booking.VehicleAlreadyBookedForSlot);
    }

    private async Task<Guid> ResolveBranchIdAsync(Guid currentUserId, Guid? explicitBranchId)
    {
        if (explicitBranchId.HasValue) return explicitBranchId.Value;
        var user = await userRepo.GetByIdAsync(currentUserId);
        return user?.BranchId ?? Guid.Empty;
    }

    /// <summary>CheckedIn → InProgress là transition duy nhất không có side-effect, được phép qua UpdateStatus.</summary>
    private static bool IsAllowedTransition(byte from, byte to) => (from, to) switch
    {
        (BookingStatus.CheckedIn, BookingStatus.InProgress) => true,
        _ => false,
    };

    /// <summary>
    /// Dựng BookingLine từ selection cuối cùng. Nếu request chọn Group, group được
    /// expand thành các Leaf active; Group không bao giờ trở thành BookingLine.
    /// </summary>
    private async Task<List<BookingLine>> BuildLinesAsync(
        Guid branchId, List<BookingServiceSelection> selections, CancellationToken ct)
    {
        if (selections is null || selections.Count == 0)
            throw AppException.BadRequest(ValidationMessage.Booking.MustSelectAtLeastOneService);

        var normalized = await ExpandToLeafSelectionsAsync(selections, ct);
        var loaded = new List<(BookingServiceSelection Selection, ServiceCatalogItem Service)>();
        foreach (var selection in normalized)
        {
            var service = await LoadServiceForBookingAsync(branchId, selection.ServiceCatalogItemId, ct);
            loaded.Add((selection, service));
        }

        ServicePackagePolicy.Validate(
            loaded.Select(item => (
                item.Service.ServiceCatalogItemId,
                PackageType: (ServicePackageType)item.Service.ServicePackageType))
            .ToArray());

        return loaded
            .Select(item => CreateBookingLine(item.Service, item.Selection.Quantity))
            .ToList();
    }

    /// <summary>
    /// Chuyển selection UI thành tập Leaf cuối cùng. Chọn Group tương đương chọn
    /// toàn bộ child active; nếu request đồng thời có Group và một Child thì child
    /// được gộp theo ID và quantity explicit của child được ưu tiên.
    /// </summary>
    private async Task<List<BookingServiceSelection>> ExpandToLeafSelectionsAsync(
        IReadOnlyCollection<BookingServiceSelection> selections, CancellationToken ct)
    {
        var normalized = new Dictionary<Guid, short>();

        foreach (var selection in selections)
        {
            if (selection.Quantity < 1)
                throw AppException.BadRequest(ValidationMessage.Booking.InvalidServiceQuantity);

            var selected = await serviceCatalogRepo.GetByIdAsync(selection.ServiceCatalogItemId)
                ?? throw AppException.NotFound(ValidationMessage.Booking.ServiceNotFound(selection.ServiceCatalogItemId));

            if (selected.ServiceNodeType == (byte)ServiceNodeType.Leaf)
            {
                if (!selected.IsActive)
                    throw AppException.BadRequest(ValidationMessage.Booking.ServiceInactive(selected.ServiceName));

                AddLeafSelection(normalized, selected.ServiceCatalogItemId, selection.Quantity, overwrite: true);
                continue;
            }

            if (selected.ServiceNodeType != (byte)ServiceNodeType.Group)
                throw AppException.BadRequest(ValidationMessage.ServiceCatalog.InvalidNodeType);

            if (!selected.IsActive)
                throw AppException.BadRequest(ValidationMessage.Booking.ServiceInactive(selected.ServiceName));

            var children = await serviceCatalogRepo.GetChildrenAsync(selected.ServiceCatalogItemId);
            if (children.Count == 0)
                throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupHasNoActiveChildren);

            foreach (var child in children)
            {
                if (child.ServiceNodeType != (byte)ServiceNodeType.Leaf)
                    throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupContainsNonBookableChild);

                AddLeafSelection(normalized, child.ServiceCatalogItemId, selection.Quantity, overwrite: false);
            }
        }

        if (normalized.Count == 0)
            throw AppException.BadRequest(ValidationMessage.Booking.MustSelectAtLeastOneService);

        return normalized
            .Select(item => new BookingServiceSelection
            {
                ServiceCatalogItemId = item.Key,
                Quantity = item.Value,
            })
            .ToList();
    }

    private static void AddSelectionStates(
        ServiceCatalogItem node,
        ISet<Guid> selectedLeafIds,
        ICollection<ServiceSelectionStateDto> states)
    {
        var activeChildren = node.ChildServiceCatalogItems
            .Where(child => child.IsActive)
            .OrderBy(child => child.ServiceName)
            .ToList();

        if (node.ServiceNodeType == (byte)ServiceNodeType.Group)
        {
            var selectedChildCount = activeChildren.Count(child => selectedLeafIds.Contains(child.ServiceCatalogItemId));
            var activeChildCount = activeChildren.Count;

            states.Add(new ServiceSelectionStateDto
            {
                ServiceCatalogItemId = node.ServiceCatalogItemId,
                ParentServiceCatalogItemId = node.ParentServiceCatalogItemId,
                ServiceNodeType = node.ServiceNodeType,
                IsChecked = activeChildCount > 0 && selectedChildCount == activeChildCount,
                IsIndeterminate = selectedChildCount > 0 && selectedChildCount < activeChildCount,
                SelectedChildCount = selectedChildCount,
                ActiveChildCount = activeChildCount,
                IsBookable = false,
            });

            foreach (var child in activeChildren)
                AddSelectionStates(child, selectedLeafIds, states);

            return;
        }

        states.Add(new ServiceSelectionStateDto
        {
            ServiceCatalogItemId = node.ServiceCatalogItemId,
            ParentServiceCatalogItemId = node.ParentServiceCatalogItemId,
            ServiceNodeType = node.ServiceNodeType,
            IsChecked = selectedLeafIds.Contains(node.ServiceCatalogItemId),
            IsIndeterminate = false,
            SelectedChildCount = 0,
            ActiveChildCount = 0,
            IsBookable = node.ServiceNodeType == (byte)ServiceNodeType.Leaf,
        });
    }

    private static void AddLeafSelection(
        IDictionary<Guid, short> normalized,
        Guid serviceCatalogItemId,
        short quantity,
        bool overwrite)
    {
        // A duplicate leaf is one logical selection. Explicit child selection wins
        // over the quantity inherited from a parent group.
        if (!overwrite && normalized.ContainsKey(serviceCatalogItemId))
            return;

        normalized[serviceCatalogItemId] = quantity;
    }

    /// <summary>Dựng 1 BookingLine: validate dịch vụ active + thuộc chi nhánh, snapshot giá.</summary>
    /// <remarks>Gọi: IServiceCatalogRepository.GetByIdAsync → IBranchRepository.GetBranchServiceAsync.</remarks>
    private async Task<BookingLine> BuildLineAsync(
        Guid branchId, Guid serviceCatalogItemId, short quantity, CancellationToken ct)
    {
        var service = await LoadServiceForBookingAsync(branchId, serviceCatalogItemId, ct);
        return CreateBookingLine(service, quantity);
    }

    private async Task<ServiceCatalogItem> LoadServiceForBookingAsync(
        Guid branchId, Guid serviceCatalogItemId, CancellationToken ct)
    {
        var service = await serviceCatalogRepo.GetByIdAsync(serviceCatalogItemId)
            ?? throw AppException.NotFound(ValidationMessage.Booking.ServiceNotFound(serviceCatalogItemId));
        if (!service.IsActive)
            throw AppException.BadRequest(ValidationMessage.Booking.ServiceInactive(service.ServiceName));

        if (service.ServiceNodeType == (byte)ServiceNodeType.Group)
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupCannotBeBooked);

        if (service.ServiceNodeType != (byte)ServiceNodeType.Leaf)
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.InvalidNodeType);

        var branchService = await branchRepo.GetBranchServiceAsync(branchId, serviceCatalogItemId, ct);
        if (branchService is null || !branchService.IsActive)
            throw AppException.BadRequest(ValidationMessage.Booking.ServiceNotAvailableAtBranch(service.ServiceName));

        return service;
    }

    private static BookingLine CreateBookingLine(ServiceCatalogItem service, short quantity)
    {
        var qty = quantity < 1 ? (short)1 : quantity;
        return new BookingLine
        {
            ServiceCatalogItemId = service.ServiceCatalogItemId,
            ServiceName          = service.ServiceName,
            UnitPrice            = service.BasePrice,
            DurationMinutes      = service.DurationMinutes,
            Quantity             = qty,
            LineTotal            = service.BasePrice * qty,
        };
    }

    private static (VehicleCondition Condition, decimal Rate, decimal Amount) CalculateVehicleSurcharge(
        Vehicle vehicle,
        decimal serviceSubtotal)
    {
        var condition = VehicleConditionPolicy.GetCondition(vehicle.ManufactureYear);
        var rate = VehicleConditionPolicy.GetSurchargeRate(condition);
        var amount = Math.Round(serviceSubtotal * rate, 2, MidpointRounding.AwayFromZero);
        return (condition, rate, amount);
    }

    /// <summary>
    /// Tính lại tiền dịch vụ và phụ thu theo tỷ lệ snapshot đã chốt lúc tạo đơn.
    /// Condition/rate không đổi khi xe bị sửa sau đó; amount được cập nhật nếu staff thay đổi danh sách dịch vụ.
    /// </summary>
    private static void Recalculate(Booking booking)
    {
        var serviceSubtotal = booking.BookingLines.Sum(line => line.LineTotal);
        booking.VehicleSurchargeAmount = Math.Round(
            serviceSubtotal * booking.VehicleSurchargeRate,
            2,
            MidpointRounding.AwayFromZero);
        booking.BookingSubtotal = serviceSubtotal + booking.VehicleSurchargeAmount;
        booking.BookingFinalAmount = booking.BookingSubtotal - booking.BookingDiscountAmount;
    }

    /// <summary>Chỉ cho thêm/sửa dịch vụ khi booking đang Confirmed/CheckedIn/InProgress.</summary>
    private static void EnsureEditable(Booking booking)
    {
        if (booking.BookingStatus is not (BookingStatus.Confirmed or BookingStatus.CheckedIn or BookingStatus.InProgress))
            throw AppException.BadRequest(ValidationMessage.Booking.OnlyEditWhenEditableStatus);
    }

    /// <summary>Resolve xe cho walk-in: ưu tiên xe có sẵn của khách, nếu không thì tạo xe ad-hoc.</summary>
    /// <remarks>Gọi: IVehicleRepository.GetByIdAsync / ExistsLicensePlateAsync / CreateAsync.</remarks>
    private async Task<Vehicle> ResolveWalkInVehicleAsync(Guid customerId, CreateWalkInBookingRequest request)
    {
        if (request.ExistingVehicleId is { } vehicleId)
            return await vehicleRepo.GetByIdAsync(vehicleId, customerId)
                ?? throw AppException.NotFound(ValidationMessage.Booking.CustomerVehicleNotFound);

        if (request.NewVehicle is null)
            throw AppException.BadRequest(ValidationMessage.Booking.MustChooseOrCreateVehicle);

        var plate = request.NewVehicle.LicensePlate.ToUpperInvariant();
        if (await vehicleRepo.ExistsLicensePlateAsync(plate))
            throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);

        var brandCatalog = request.NewVehicle.BrandCatalogId is { } brandId
            ? await brandCatalogRepo.GetByIdAsync(brandId)
                ?? throw AppException.NotFound("Không tìm thấy hãng xe.")
            : null;

        if (brandCatalog is not null && !brandCatalog.IsActive)
            throw AppException.BadRequest("Hãng xe đã bị vô hiệu hóa.");

        var bodyStyleCatalog = request.NewVehicle.BodyStyleCatalogId is { } bodyStyleId
            ? await bodyStyleCatalogRepo.GetByIdAsync(bodyStyleId)
                ?? throw AppException.NotFound("Không tìm thấy kiểu dáng xe.")
            : null;

        if (bodyStyleCatalog is not null)
        {
            if (!bodyStyleCatalog.IsActive)
                throw AppException.BadRequest("Kiểu dáng xe đã bị vô hiệu hóa.");
            if (bodyStyleCatalog.VehicleType != (byte)request.NewVehicle.VehicleType)
                throw AppException.BadRequest("Kiểu dáng xe không phù hợp với loại phương tiện đã chọn.");
        }

        var vehicle = new Vehicle
        {
            UserId       = customerId,
            LicensePlate = plate,
            VehicleType  = (byte)request.NewVehicle.VehicleType,
            BrandCatalogId = brandCatalog?.VehicleBrandCatalogId,
            Brand        = brandCatalog?.Name
                ?? (string.IsNullOrWhiteSpace(request.NewVehicle.Brand) ? null : request.NewVehicle.Brand.Trim()),
            Model        = string.IsNullOrWhiteSpace(request.NewVehicle.Model) ? null : request.NewVehicle.Model.Trim(),
            ManufactureYear = request.NewVehicle.ManufactureYear,
            EngineCatalogId = request.NewVehicle.EngineCatalogId,
            EngineType   = request.NewVehicle.EngineType.HasValue ? (byte)request.NewVehicle.EngineType.Value : null,
            BodyStyleCatalogId = bodyStyleCatalog?.VehicleBodyStyleCatalogId,
            BodyStyle    = bodyStyleCatalog?.LegacyEnumValue ?? (request.NewVehicle.BodyStyle.HasValue ? (byte)request.NewVehicle.BodyStyle.Value : null),
            IsDeleted    = false,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion   = [],
        };
        return await vehicleRepo.CreateAsync(vehicle);
    }

    // RedeemMode: 0 = không trừ, 1 = trừ hết, 2 = trừ theo số điểm chỉ định (tối thiểu 1000)
    /// <remarks>Gọi: ILoyaltyService.GetCurrentPointsAsync.</remarks>
    private async Task<(int points, decimal discount)> ResolveRedeemAsync(
        Guid userId, byte mode, int requestedPoints, decimal maxAmount, CancellationToken ct)
    {
        if (mode == 0) return (0, 0m);

        var available = await loyaltyService.GetCurrentPointsAsync(userId, ct);
        if (available <= 0) return (0, 0m);

        int points;
        if (mode == 1)
        {
            points = available;
        }
        else if (mode == 2)
        {
            if (requestedPoints < 1000)
                throw AppException.BadRequest(ValidationMessage.Booking.MinRedeemPoints);
            if (requestedPoints > available)
                throw AppException.BadRequest(ValidationMessage.Booking.InsufficientPoints(available));
            points = requestedPoints;
        }
        else
        {
            return (0, 0m);
        }

        var discount = Math.Min(points, maxAmount);
        points = (int)discount;
        return (points, discount);
    }

    /// <remarks>Gọi: IBookingRepository.ExistsCodeAsync (retry tối đa 5 lần).</remarks>
    private async Task<string> GenerateUniqueCodeAsync(CancellationToken ct)
    {
        for (int i = 0; i < 5; i++)
        {
            var code = BookingCodeHelper.NewBookingCode();
            if (!await bookingRepo.ExistsCodeAsync(code, ct)) return code;
        }
        throw AppException.Conflict(ValidationMessage.Booking.CodeGenerationFailed);
    }

    /// <remarks>Gọi: IBookingRepository.ExistsQrAsync (retry tối đa 5 lần).</remarks>
    private async Task<string> GenerateUniqueQrAsync(CancellationToken ct)
    {
        for (int i = 0; i < 5; i++)
        {
            var qr = BookingCodeHelper.NewQrToken();
            if (!await bookingRepo.ExistsQrAsync(qr, ct)) return qr;
        }
        throw AppException.Conflict(ValidationMessage.Booking.QrGenerationFailed);
    }

    /// <summary>Gửi email xác nhận booking kèm QR — best-effort, lỗi không rollback booking.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → IBranchRepository.GetByIdAsync → IVehicleRepository.GetByIdAsync → IEmailService.SendBookingConfirmationEmailAsync.</remarks>
    private async Task TrySendConfirmationEmailAsync(Guid userId, Booking booking, SlotInventory slot)
    {
        try
        {
            var user = await userRepo.GetByIdAsync(userId);
            if (user?.Email is null) return;   // khách guest có thể không có email

            var branch = await branchRepo.GetByIdAsync(booking.BranchId);
            var vehicle = await vehicleRepo.GetByIdAsync(booking.VehicleId, userId);

            var lines = booking.BookingLines
                .Select(l => (l.ServiceName, l.LineTotal))
                .ToList();

            await emailService.SendBookingConfirmationEmailAsync(
                user.Email, user.FullName, booking.BookingCode, booking.CheckInQrCode,
                slot.SlotDate, slot.SlotStartTime, slot.SlotEndTime, booking.BookingFinalAmount,
                branchName: branch?.Name,
                licensePlate: vehicle?.LicensePlate,
                serviceLines: lines);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Gửi email xác nhận booking {Code} thất bại", booking.BookingCode);
        }
    }

    /// <summary>Resolve + validate voucher (từ UserVoucherId hoặc mã code) — check quyền sở hữu, hạn dùng, chi nhánh, min order.</summary>
    /// <remarks>Gọi: IVoucherRepository.GetUserVoucherByIdAsync / GetByCodeAsync / GetUserVoucherAsync.</remarks>
    private async Task<UserVoucher> ResolveAndValidateVoucherAsync(
        Guid userId, Guid? userVoucherId, string? voucherCode, Guid branchId, decimal subtotal, CancellationToken ct)
    {
        UserVoucher? userVoucher = null;
        Voucher? voucher = null;

        if (userVoucherId.HasValue)
        {
            userVoucher = await voucherRepo.GetUserVoucherByIdAsync(userVoucherId.Value, ct);
            if (userVoucher == null)
                throw AppException.NotFound(ValidationMessage.Booking.MyVoucherNotFound);
            voucher = userVoucher.Voucher;
        }
        else if (!string.IsNullOrWhiteSpace(voucherCode))
        {
            var code = voucherCode.Trim().ToUpperInvariant();
            voucher = await voucherRepo.GetByCodeAsync(code, ct);
            if (voucher == null)
                throw AppException.NotFound(ValidationMessage.Booking.VoucherCodeNotFound(code));

            userVoucher = await voucherRepo.GetUserVoucherAsync(userId, voucher.VoucherId, ct);
        }

        if (voucher == null)
            throw AppException.BadRequest(ValidationMessage.Booking.VoucherInfoNotFound);

        // Track if this is a newly created UserVoucher on-the-fly (meaning it wasn't already in the DB)
        var isNewClaim = userVoucher == null;

        // Rút gọn: Nếu là voucher hệ thống (do admin tạo, BranchId == null):
        if (voucher.BranchId == null)
        {
            // Bất kỳ user nào cũng được sử dụng (tự sinh UserVoucher bản ghi ngầm nếu chưa có)
            if (userVoucher == null)
            {
                userVoucher = new UserVoucher
                {
                    UserVoucherId = Guid.NewGuid(),
                    UserId = userId,
                    VoucherId = voucher.VoucherId,
                    VoucherStatus = UserVoucherStatus.Redeemed, // Mặc định đã claim để chuẩn bị đổi
                    RedeemedAtUtc = DateTime.UtcNow,
                    ExpiredAtUtc = voucher.EndUtc,
                    Voucher = voucher
                };
            }
        }
        else
        {
            // Voucher chi nhánh / Voucher gán hạng: bắt buộc user phải đổi hoặc nhận trước
            if (userVoucher == null)
                throw AppException.BadRequest(ValidationMessage.Booking.VoucherMustBeClaimedFirst);
        }

        if (userVoucher.UserId != userId)
            throw AppException.Forbidden(ValidationMessage.Booking.VoucherNotOwned);

        if (userVoucher.VoucherStatus != UserVoucherStatus.Redeemed)
            throw AppException.BadRequest(ValidationMessage.Booking.VoucherAlreadyUsedOrInvalid);

        if (!voucher.IsActive || voucher.ApprovalStatus != VoucherApprovalStatus.Approved)
            throw AppException.BadRequest(ValidationMessage.Booking.VoucherNotActivatedOrApproved);

        var now = DateTime.UtcNow;
        if (now < voucher.StartUtc || now >= voucher.EndUtc)
            throw AppException.BadRequest(ValidationMessage.Booking.VoucherExpiredOrNotStarted);

        if (voucher.BranchId.HasValue && voucher.BranchId.Value != branchId)
            throw AppException.BadRequest(ValidationMessage.Booking.VoucherNotApplicableToBranch);

        if (voucher.MinOrderAmount.HasValue && subtotal < voucher.MinOrderAmount.Value)
            throw AppException.BadRequest(ValidationMessage.Booking.VoucherMinOrderNotMet(voucher.MinOrderAmount.Value));

        if (isNewClaim && voucher.UsedCount >= voucher.Quantity)
            throw AppException.BadRequest(ValidationMessage.Voucher.OutOfStock);

        return userVoucher;
    }

    private static decimal CalculateDiscount(Voucher voucher, decimal subtotal)
    {
        decimal discount = 0m;
        if (voucher.DiscountType == DiscountType.Percentage)
        {
            discount = subtotal * (voucher.DiscountValue / 100m);
            if (voucher.MaxDiscountAmount.HasValue && discount > voucher.MaxDiscountAmount.Value)
            {
                discount = voucher.MaxDiscountAmount.Value;
            }
        }
        else if (voucher.DiscountType == DiscountType.FixedAmount)
        {
            discount = voucher.DiscountValue;
            if (discount > subtotal)
            {
                discount = subtotal;
            }
        }
        return discount;
    }

    // Đọc % giảm giá từ benefit DiscountPercent của hạng (nếu có, hạng chỉ có tối đa 1 dòng mỗi loại benefit).
    private static decimal ResolveTierDiscountPercent(IReadOnlyList<TierBenefit> tierBenefits)
    {
        var benefit = tierBenefits.FirstOrDefault(b => b.BenefitType == BenefitType.DiscountPercent);
        return benefit is not null && decimal.TryParse(benefit.BenefitValue, out var percent) ? percent : 0m;
    }

    // Benefit AdvanceBookingDays override số ngày đặt trước tối đa mặc định của hạng đó.
    private void ValidateAdvanceBookingWindow(DateOnly slotDate, IReadOnlyList<TierBenefit> tierBenefits)
    {
        var benefit = tierBenefits.FirstOrDefault(b => b.BenefitType == BenefitType.AdvanceBookingDays);
        var maxDays = benefit is not null && int.TryParse(benefit.BenefitValue, out var tierDays)
            ? tierDays
            : DefaultMaxAdvanceBookingDays;

        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(VietnamUtcOffsetHours));
        if (slotDate > today.AddDays(maxDays))
            throw AppException.BadRequest(ValidationMessage.Booking.SlotTooFarInAdvance);
    }
}
