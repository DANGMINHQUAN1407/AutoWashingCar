using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Payment;

namespace WashingCar_API.Controllers;

/// <summary>
/// Thanh toán: đặt cọc/trả đủ online qua VNPay, thu phần còn lại tại quầy, xem lịch sử.
/// POST /api/payments/deposit và /final yêu cầu header Idempotency-Key (IdempotencyMiddleware).
/// </summary>
[Route("api/payments")]
[Authorize]
public class PaymentController(IPaymentService paymentService) : BaseApiController
{
    private readonly IPaymentService _paymentService = paymentService;

    /// <summary>Khởi tạo thanh toán online (cọc % hoặc trả đủ 100%) → trả URL VNPay. Cần Idempotency-Key.</summary>
    /// <remarks>
    /// Gọi: PaymentService.CreateDepositAsync → IBookingRepository.GetDetailAsync → IPaymentRepository.GetCompletedAmountAsync
    /// → helper GenerateUniqueTxnRefAsync (→ ExistsTransactionCodeAsync) → AddAsync + SaveChangesAsync
    /// → VnPayHelper.CreatePaymentUrl (external helper).
    /// </remarks>
    [HttpPost("deposit")]
    public async Task<IActionResult> CreateDeposit([FromBody] CreateDepositRequest request, CancellationToken ct)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await _paymentService.CreateDepositAsync(CurrentUserId, request, clientIp, ct);
        return Created(nameof(GetById), new { id = result.PaymentId }, result, "Đã tạo yêu cầu thanh toán.");
    }

    /// <summary>VNPay redirect trình duyệt khách về đây (ReturnUrl) — verify + hiển thị kết quả.</summary>
    /// <remarks>
    /// Gọi: PaymentService.HandleVnPayReturnAsync → helper VerifyAndLocateAsync (→ VnPayHelper.ValidateSignature
    /// + IPaymentRepository.GetTrackedByTransactionCodeAsync) → helper ApplyGatewayResultAsync
    /// (→ IPaymentRepository.SaveChangesAsync + IBookingRepository.GetTrackedByIdAsync
    /// → IBookingService.MarkConfirmedAsync/CloseAsync).
    /// </remarks>
    [HttpGet("vnpay/return")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayReturn([FromServices] Microsoft.Extensions.Configuration.IConfiguration config, CancellationToken ct)
    {
        var data = ParseRawQuery(Request.QueryString.Value);
        var result = await _paymentService.HandleVnPayReturnAsync(data, ct);

        string? frontendUrl = Request.Query["frontendUrl"].ToString();
        if (string.IsNullOrEmpty(frontendUrl))
        {
            frontendUrl = config["App:FrontendUrl"] ?? "http://localhost:5173";
        }

        var status = result.Success ? "success" : "failed";
        var msg = result.Message ?? (result.Success ? "Thanh toán thành công" : "Thanh toán không thành công");
        var redirectUrl = $"{frontendUrl.TrimEnd('/')}/customer/bookings?paymentStatus={status}&message={System.Uri.EscapeDataString(msg)}";

        return Redirect(redirectUrl);
    }

    /// <summary>VNPay gọi server-to-server (IPN) — nguồn cập nhật chính thức; trả JSON theo chuẩn VNPay.</summary>
    /// <remarks>Gọi: PaymentService.HandleVnPayIpnAsync — cùng chuỗi với HandleVnPayReturnAsync, trả JSON theo chuẩn IPN.</remarks>
    [HttpGet("vnpay/ipn")]
    [AllowAnonymous]
    public async Task<IActionResult> VnPayIpn(CancellationToken ct)
    {
        var data = ParseRawQuery(Request.QueryString.Value);
        var json = await _paymentService.HandleVnPayIpnAsync(data, ct);
        return Content(json, "application/json");
    }

    // Đọc raw query string (giữ nguyên URL-encoding của VNPay) để tính hash khớp chính xác
    private static Dictionary<string, string> ParseRawQuery(string? queryString)
        => (queryString?.TrimStart('?') ?? "")
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Select(p => p.Split('=', 2))
            .Where(p => p.Length == 2)
            .ToDictionary(p => p[0], p => p[1]);

    /// <summary>Thu phần còn lại tại quầy (Staff/Manager/Admin) — Cash/Card/EWallet. Cần Idempotency-Key.</summary>
    /// <remarks>
    /// Gọi: PaymentService.CreateFinalPaymentAsync → IBookingRepository.GetTrackedByIdAsync
    /// → IPaymentRepository.GetCompletedAmountAsync → AddAsync + SaveChangesAsync
    /// → IBookingService.MarkConfirmedAsync/CloseAsync (tùy trạng thái booking).
    /// </remarks>
    [HttpPost("final")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> CreateFinal([FromBody] CreateFinalPaymentRequest request, CancellationToken ct)
    {
        var result = await _paymentService.CreateFinalPaymentAsync(CurrentUserId, request, ct);
        return Created(nameof(GetById), new { id = result.PaymentId }, result, "Đã ghi nhận thanh toán.");
    }

    /// <summary>Tạo QR VNPay tại quầy (Staff/Manager/Admin) để khách quét trả phần còn lại. Cần Idempotency-Key.</summary>
    /// <remarks>
    /// Gọi: PaymentService.CreateCounterQrAsync → IBookingRepository.GetDetailAsync
    /// → IPaymentRepository.GetCompletedAmountAsync + AddAsync + SaveChangesAsync → VnPayHelper.CreatePaymentUrl.
    /// </remarks>
    [HttpPost("counter-qr")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> CreateCounterQr([FromBody] CreateCounterQrRequest request, CancellationToken ct)
    {
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
        var result = await _paymentService.CreateCounterQrAsync(CurrentUserId, request, clientIp, ct);
        return Created(nameof(GetById), new { id = result.PaymentId }, result, "Đã tạo QR thanh toán tại quầy.");
    }

    /// <summary>Lịch sử thanh toán của tôi (lọc theo booking/status/ngày, phân trang).</summary>
    /// <remarks>Gọi: PaymentService.GetMyPaymentsAsync → IPaymentRepository.GetPagedAsync(ownerUserId: userId).</remarks>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine([FromQuery] PaymentQuery query, CancellationToken ct)
    {
        var result = await _paymentService.GetMyPaymentsAsync(CurrentUserId, query, ct);
        return Paged(result);
    }

    /// <summary>Lịch sử thanh toán toàn hệ thống (Staff/Manager/Admin) — lọc theo bookingId/status…</summary>
    /// <remarks>Gọi: PaymentService.GetPaymentsAsync → IPaymentRepository.GetPagedAsync(ownerUserId: null).</remarks>
    [HttpGet]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> GetList([FromQuery] PaymentQuery query, CancellationToken ct)
    {
        var result = await _paymentService.GetPaymentsAsync(query, ct);
        return Paged(result);
    }

    /// <summary>Chi tiết 1 giao dịch (kèm tender). Chủ đơn hoặc Staff/Manager/Admin mới xem được.</summary>
    /// <remarks>Gọi: PaymentService.GetByIdAsync → IPaymentRepository.GetDetailAsync.</remarks>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var isPrivileged = User.IsInRole(UserRole.Staff) || User.IsInRole(UserRole.Manager) || User.IsInRole(UserRole.Admin);
        var payment = await _paymentService.GetByIdAsync(CurrentUserId, isPrivileged, id, ct);
        return Success(payment);
    }
}
