using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_Common.Helpers;
using WashingCar_Common.Settings;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Payment;

namespace WashingCar_BLL.Services;

/// <summary>
/// Thanh toán VNPay (online) + thu tại quầy. Gọi ngược vào IBookingService (Service→Service) sau khi
/// thanh toán thành công để chuyển trạng thái booking — đây là 1 trong 4 đường Service gọi chéo Service duy nhất hệ thống.
/// </summary>
public class PaymentService(
    IPaymentRepository        paymentRepo,
    IBookingRepository        bookingRepo,
    IBookingService           bookingService,
    IOptions<VnPaySettings>   vnPayOptions,
    IOptions<PaymentSettings> paymentOptions,
    ILogger<PaymentService>   logger) : IPaymentService
{
    private readonly VnPaySettings   _vnpay   = vnPayOptions.Value;
    private readonly PaymentSettings _payment = paymentOptions.Value;

    // ─── Deposit / Full online (VNPay) ───────────────────────────────────────

    /// <summary>Khởi tạo thanh toán online (cọc % hoặc trả đủ 100%) → trả URL VNPay.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetDetailAsync → IPaymentRepository.GetCompletedAmountAsync
    /// → helper GenerateUniqueTxnRefAsync (→ ExistsTransactionCodeAsync) → AddAsync + SaveChangesAsync
    /// → VnPayHelper.CreatePaymentUrl (external helper, không phải Repository).
    /// </remarks>
    public async Task<DepositInitResponseDto> CreateDepositAsync(
        Guid userId, CreateDepositRequest request, string clientIp, CancellationToken ct = default)
    {
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireBookingLockAsync(request.BookingId, ct);

        var booking = await bookingRepo.GetDetailAsync(request.BookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (booking.UserId != userId)
            throw AppException.Forbidden(ValidationMessage.Payment.ForbiddenPay);

        if (booking.BookingStatus != BookingStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.Payment.OnlyPayWhenPending);

        var pendingPayments = await paymentRepo.GetTrackedPendingPaymentsAsync(booking.BookingId, ct);
        foreach (var p in pendingPayments)
        {
            p.PaymentStatus = PaymentStatus.Cancelled;
        }

        var alreadyPaid = await paymentRepo.GetCompletedAmountAsync(booking.BookingId, ct);
        if (alreadyPaid > 0)
            throw AppException.Conflict(ValidationMessage.Payment.AlreadyHasPayment);

        var amount = request.PayFull
            ? booking.BookingFinalAmount
            : Math.Round(booking.BookingFinalAmount * _payment.DepositPercent / 100m, 0, MidpointRounding.AwayFromZero);

        if (amount <= 0)
            throw AppException.BadRequest(ValidationMessage.Payment.InvalidAmount);

        var txnRef = await GenerateUniqueTxnRefAsync(ct);

        var payment = new Payment
        {
            BookingId       = booking.BookingId,
            PaymentType     = request.PayFull ? PaymentType.FullPayment : PaymentType.Deposit,
            PaymentMethod   = PaymentMethod.EWallet,
            PaymentStatus   = PaymentStatus.Pending,
            Amount          = amount,
            TransactionCode = txnRef,
            CreatedAtUtc    = DateTime.UtcNow,
        };

        await paymentRepo.AddAsync(payment, ct);
        await paymentRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var orderInfo = $"Thanh toan booking {booking.BookingCode}";
        var url = VnPayHelper.CreatePaymentUrl(_vnpay, txnRef, amount, orderInfo, clientIp, request.FrontendUrl);

        logger.LogInformation("Tạo payment {Id} ({Type}) cho booking {Code}, amount {Amount}",
            payment.PaymentId, payment.PaymentType, booking.BookingCode, amount);

        return new DepositInitResponseDto
        {
            PaymentId       = payment.PaymentId,
            TransactionCode = txnRef,
            PaymentUrl      = url,
        };
    }

    /// <summary>Xử lý redirect trình duyệt từ VNPay (ReturnUrl) — verify chữ ký + cập nhật trạng thái.</summary>
    /// <remarks>
    /// Gọi: helper VerifyAndLocateAsync (→ VnPayHelper.ValidateSignature + IPaymentRepository.GetTrackedByTransactionCodeAsync)
    /// → helper ApplyGatewayResultAsync (→ IPaymentRepository.SaveChangesAsync + IBookingRepository.GetTrackedByIdAsync
    /// → IBookingService.MarkConfirmedAsync/CloseAsync).
    /// </remarks>
    public async Task<VnPayReturnDto> HandleVnPayReturnAsync(
        IDictionary<string, string> vnpParams, CancellationToken ct = default)
    {
        var (signatureValid, payment, gatewaySuccess, responseCode) = await VerifyAndLocateAsync(vnpParams, ct);

        if (!signatureValid)
            return new VnPayReturnDto { Success = false, ResponseCode = "97", Message = "Sai chữ ký" };
        if (payment is null)
            return new VnPayReturnDto { Success = false, ResponseCode = "01", Message = "Không tìm thấy giao dịch" };
        if (!IsAmountValid(payment, vnpParams))
            return new VnPayReturnDto { Success = false, ResponseCode = "04", Message = "Sai số tiền", PaymentId = payment.PaymentId };

        await ApplyGatewayResultAsync(payment, gatewaySuccess, ct);

        return new VnPayReturnDto
        {
            Success      = gatewaySuccess,
            ResponseCode = responseCode,
            Message      = gatewaySuccess ? "Thanh toán thành công" : "Thanh toán không thành công",
            PaymentId    = payment.PaymentId,
        };
    }

    /// <summary>Xử lý IPN server-to-server từ VNPay — nguồn cập nhật chính thức, idempotent theo PaymentStatus.</summary>
    /// <remarks>Gọi: cùng chuỗi với HandleVnPayReturnAsync — VerifyAndLocateAsync → ApplyGatewayResultAsync.</remarks>
    public async Task<string> HandleVnPayIpnAsync(
        IDictionary<string, string> vnpParams, CancellationToken ct = default)
    {
        var (signatureValid, payment, gatewaySuccess, _) = await VerifyAndLocateAsync(vnpParams, ct);

        if (!signatureValid)                                  return Ipn("97", "Invalid signature");
        if (payment is null)                                  return Ipn("01", "Order not found");
        if (!IsAmountValid(payment, vnpParams))               return Ipn("04", "Invalid amount");
        if (payment.PaymentStatus != PaymentStatus.Pending)   return Ipn("02", "Order already confirmed");

        await ApplyGatewayResultAsync(payment, gatewaySuccess, ct);
        return Ipn("00", "Confirm Success");
    }

    // ─── Counter QR (VNPay tại quầy cho staff) ───────────────────────────────

    /// <summary>Staff tạo QR VNPay tại quầy để khách quét trả phần còn lại.</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetDetailAsync → IPaymentRepository.GetCompletedAmountAsync
    /// → helper GenerateUniqueTxnRefAsync → AddAsync + SaveChangesAsync → VnPayHelper.CreatePaymentUrl.
    /// </remarks>
    public async Task<DepositInitResponseDto> CreateCounterQrAsync(
        Guid staffId, CreateCounterQrRequest request, string clientIp, CancellationToken ct = default)
    {
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireBookingLockAsync(request.BookingId, ct);

        var booking = await bookingRepo.GetDetailAsync(request.BookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (booking.BookingStatus is BookingStatus.Closed or BookingStatus.Cancelled or BookingStatus.NoShow)
            throw AppException.BadRequest(ValidationMessage.Payment.CannotCreateQrForClosed);

        var pendingPayments = await paymentRepo.GetTrackedPendingPaymentsAsync(booking.BookingId, ct);
        foreach (var p in pendingPayments)
        {
            p.PaymentStatus = PaymentStatus.Cancelled;
        }

        var paid      = await paymentRepo.GetCompletedAmountAsync(booking.BookingId, ct);
        var remaining = booking.BookingFinalAmount - paid;
        if (remaining <= 0)
            throw AppException.BadRequest(ValidationMessage.Payment.FullyPaidNoQrNeeded);

        var txnRef = await GenerateUniqueTxnRefAsync(ct);

        var payment = new Payment
        {
            BookingId       = booking.BookingId,
            PaymentType     = paid > 0 ? PaymentType.Remaining : PaymentType.FullPayment,
            PaymentMethod   = PaymentMethod.EWallet,
            PaymentStatus   = PaymentStatus.Pending,
            Amount          = remaining,
            TransactionCode = txnRef,
            CreatedAtUtc    = DateTime.UtcNow,
        };

        await paymentRepo.AddAsync(payment, ct);
        await paymentRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        var orderInfo = $"TT quay {booking.BookingCode}";
        var url = VnPayHelper.CreatePaymentUrl(_vnpay, txnRef, remaining, orderInfo, clientIp, request.FrontendUrl);

        logger.LogInformation("Tạo counter QR {Id} cho booking {Code}, amount {Amount} bởi staff {Staff}",
            payment.PaymentId, booking.BookingCode, remaining, staffId);

        return new DepositInitResponseDto
        {
            PaymentId       = payment.PaymentId,
            TransactionCode = txnRef,
            PaymentUrl      = url,
        };
    }

    // ─── Final payment tại quầy ──────────────────────────────────────────────

    /// <summary>Staff thu tiền mặt/thẻ/ví tại quầy — Completed ngay (không qua Pending như VNPay).</summary>
    /// <remarks>
    /// Gọi: IBookingRepository.GetTrackedByIdAsync → IPaymentRepository.GetCompletedAmountAsync → AddAsync + SaveChangesAsync
    /// → IBookingService.MarkConfirmedAsync (nếu booking đang Pending) / CloseAsync (nếu booking đã Completed).
    /// </remarks>
    public async Task<PaymentDto> CreateFinalPaymentAsync(
        Guid staffId, CreateFinalPaymentRequest request, CancellationToken ct = default)
    {
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireBookingLockAsync(request.BookingId, ct);

        var booking = await bookingRepo.GetTrackedByIdAsync(request.BookingId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Booking.NotFound);

        if (booking.BookingStatus is BookingStatus.Closed or BookingStatus.Cancelled or BookingStatus.NoShow)
            throw AppException.BadRequest(ValidationMessage.Payment.CannotCollectForClosed);

        var pendingPayments = await paymentRepo.GetTrackedPendingPaymentsAsync(booking.BookingId, ct);
        foreach (var p in pendingPayments)
        {
            p.PaymentStatus = PaymentStatus.Cancelled;
        }

        var paid      = await paymentRepo.GetCompletedAmountAsync(booking.BookingId, ct);
        var remaining = booking.BookingFinalAmount - paid;
        if (remaining <= 0)
            throw AppException.BadRequest(ValidationMessage.Payment.NoRemainingBalance);

        if (request.Tenders.Any(t => t.Amount <= 0))
            throw AppException.BadRequest(ValidationMessage.Payment.TenderAmountMustBePositive);

        var sum = request.Tenders.Sum(t => t.Amount);
        if (sum != remaining)
            throw AppException.BadRequest(ValidationMessage.Payment.TenderSumMismatch(sum, remaining));

        // Method = tender có số tiền lớn nhất (TenderType trùng mã PaymentMethod 1..4)
        var primaryTender = request.Tenders.OrderByDescending(t => t.Amount).First().TenderType;

        var payment = new Payment
        {
            BookingId     = booking.BookingId,
            PaymentType   = paid > 0 ? PaymentType.Remaining : PaymentType.FullPayment,
            PaymentMethod = primaryTender,
            PaymentStatus = PaymentStatus.Completed,   // thu tận tay → Completed ngay
            Amount        = remaining,
            PaidAtUtc     = DateTime.UtcNow,
            CreatedAtUtc  = DateTime.UtcNow,
            TenderAllocations = [.. request.Tenders.Select(t => new TenderAllocation
            {
                TenderType = t.TenderType,
                Amount     = t.Amount,
            })],
        };

        await paymentRepo.AddAsync(payment, ct);
        await paymentRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);

        // Walk-in trả đủ khi đơn còn Pending → xác nhận đơn luôn
        if (booking.BookingStatus == BookingStatus.Pending)
            await TryConfirmBookingAsync(booking.BookingId, ct);

        // Đã rửa xong + vừa thu đủ → đóng đơn và tích điểm loyalty
        if (booking.BookingStatus == BookingStatus.Completed)
            await TryCloseBookingAsync(booking.BookingId, ct);

        logger.LogInformation("Thu tại quầy {Amount} cho booking {Code} bởi staff {Staff}",
            remaining, booking.BookingCode, staffId);

        return payment.ToDto();
    }

    // ─── Lịch sử ─────────────────────────────────────────────────────────────

    /// <remarks>Gọi: IPaymentRepository.GetDetailAsync.</remarks>
    public async Task<PaymentDto> GetByIdAsync(
        Guid currentUserId, bool isPrivileged, Guid paymentId, CancellationToken ct = default)
    {
        var payment = await paymentRepo.GetDetailAsync(paymentId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Payment.NotFound);

        if (!isPrivileged && payment.Booking?.UserId != currentUserId)
            throw AppException.Forbidden(ValidationMessage.Payment.ForbiddenView);

        return payment.ToDto();
    }

    /// <remarks>Gọi: IPaymentRepository.GetPagedAsync(ownerUserId: userId).</remarks>
    public async Task<PagedResult<PaymentListItemDto>> GetMyPaymentsAsync(
        Guid userId, PaymentQuery query, CancellationToken ct = default)
    {
        var (items, total) = await paymentRepo.GetPagedAsync(query, userId, ct);
        return ToPaged(items, total, query);
    }

    /// <remarks>Gọi: IPaymentRepository.GetPagedAsync(ownerUserId: null).</remarks>
    public async Task<PagedResult<PaymentListItemDto>> GetPaymentsAsync(
        PaymentQuery query, CancellationToken ct = default)
    {
        var (items, total) = await paymentRepo.GetPagedAsync(query, null, ct);
        return ToPaged(items, total, query);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// <summary>Verify chữ ký + tra payment theo vnp_TxnRef. Trả (chữ ký hợp lệ, payment, cổng báo thành công, mã).</summary>
    private async Task<(bool SignatureValid, Payment? Payment, bool GatewaySuccess, string ResponseCode)>
        VerifyAndLocateAsync(IDictionary<string, string> p, CancellationToken ct)
    {
        p.TryGetValue("vnp_SecureHash", out var hash);
        if (string.IsNullOrEmpty(hash) || !VnPayHelper.ValidateSignature(p, hash, _vnpay.HashSecret))
            return (false, null, false, "");

        p.TryGetValue("vnp_TxnRef", out var txnRef);
        p.TryGetValue("vnp_ResponseCode", out var rsp);

        Payment? payment = string.IsNullOrEmpty(txnRef)
            ? null
            : await paymentRepo.GetTrackedByTransactionCodeAsync(txnRef, ct);

        return (true, payment, rsp == "00", rsp ?? "");
    }

    /// <summary>Cập nhật trạng thái payment theo kết quả cổng. Idempotent: chỉ xử lý khi đang Pending.</summary>
    private async Task ApplyGatewayResultAsync(Payment payment, bool gatewaySuccess, CancellationToken ct)
    {
        await using var transaction = await bookingRepo.BeginTransactionAsync(ct);
        await bookingRepo.AcquireBookingLockAsync(payment.BookingId, ct);
        await paymentRepo.ReloadAsync(payment, ct);

        if (payment.PaymentStatus != PaymentStatus.Pending)
        {
            await transaction.RollbackAsync(ct);
            return;
        }

        var closeAfterCommit = false;
        if (gatewaySuccess)
        {
            payment.PaymentStatus = PaymentStatus.Completed;
            payment.PaidAtUtc     = DateTime.UtcNow;

            payment.TenderAllocations.Add(new TenderAllocation
            {
                TenderType = PaymentMethod.EWallet,
                Amount     = payment.Amount,
            });

            if (payment.PaymentType is PaymentType.Deposit or PaymentType.FullPayment)
            {
                var booking = await bookingRepo.GetTrackedByIdAsync(payment.BookingId, ct);
                if (booking is not null) booking.DepositAmount = payment.Amount;
            }

            var bookingCheck = await bookingRepo.GetTrackedByIdAsync(payment.BookingId, ct);
            if (bookingCheck is not null && bookingCheck.BookingStatus == BookingStatus.Pending)
                bookingCheck.BookingStatus = BookingStatus.Confirmed;
            closeAfterCommit = bookingCheck?.BookingStatus == BookingStatus.Completed;

            await paymentRepo.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);

            // Counter QR: nếu booking đã Completed (rửa xong) thì đóng sau khi transaction payment commit.
            if (closeAfterCommit)
                await TryCloseBookingAsync(payment.BookingId, ct);
        }
        else
        {
            payment.PaymentStatus = PaymentStatus.Failed;
            await paymentRepo.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
    }

    /// <summary>Gọi hook Booking để chuyển Pending → Confirmed; bỏ qua nếu đơn không còn ở Pending.</summary>
    /// <remarks>Gọi: IBookingService.MarkConfirmedAsync (Service→Service).</remarks>
    private async Task TryConfirmBookingAsync(Guid bookingId, CancellationToken ct)
    {
        try { await bookingService.MarkConfirmedAsync(bookingId, ct); }
        catch (AppException ex) { logger.LogWarning("Bỏ qua xác nhận booking {Id}: {Message}", bookingId, ex.Message); }
    }

    /// <summary>Gọi hook Booking để chuyển Completed → Closed + tích điểm; bỏ qua nếu đơn không ở Completed.</summary>
    /// <remarks>Gọi: IBookingService.CloseAsync (Service→Service).</remarks>
    private async Task TryCloseBookingAsync(Guid bookingId, CancellationToken ct)
    {
        try { await bookingService.CloseAsync(bookingId, ct); }
        catch (AppException ex) { logger.LogWarning("Bỏ qua đóng booking {Id}: {Message}", bookingId, ex.Message); }
    }

    private async Task<string> GenerateUniqueTxnRefAsync(CancellationToken ct)
    {
        for (int i = 0; i < 5; i++)
        {
            var txn = VnPayHelper.NewTxnRef();
            if (!await paymentRepo.ExistsTransactionCodeAsync(txn, ct)) return txn;
        }
        throw AppException.Conflict(ValidationMessage.Payment.TxnRefGenerationFailed);
    }

    private static bool IsAmountValid(Payment payment, IDictionary<string, string> p)
        => p.TryGetValue("vnp_Amount", out var amtStr)
           && long.TryParse(amtStr, out var amt)
           && amt == (long)(payment.Amount * 100);

    private static string Ipn(string code, string message)
        => $"{{\"RspCode\":\"{code}\",\"Message\":\"{message}\"}}";

    private static PagedResult<PaymentListItemDto> ToPaged(
        List<Payment> items, int total, PaymentQuery query) => new()
    {
        Items      = [.. items.Select(p => p.ToListItemDto())],
        TotalCount = total,
        PageNumber = query.Page,
        PageSize   = query.PageSize,
    };
}
