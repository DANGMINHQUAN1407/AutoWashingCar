using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Booking;

namespace WashingCar_API.Controllers;

/// <summary>
/// Đặt lịch rửa xe. Khách hàng tạo & tính giá; Staff/Manager xử lý ở các endpoint sau.
/// POST /api/bookings yêu cầu header Idempotency-Key (IdempotencyMiddleware).
/// </summary>
[Route("api/bookings")]
[Authorize]
public class BookingController(IBookingService bookingService) : BaseApiController
{
    private readonly IBookingService _bookingService = bookingService;

    /// <summary>
    /// Preview selection parent-child trước khi tính giá. Endpoint không giữ slot,
    /// không đọc voucher/loyalty và không ghi database.
    /// </summary>
    [HttpPost("service-selection/preview")]
    public async Task<IActionResult> PreviewServiceSelection(
        [FromBody] ServiceSelectionPreviewRequest request,
        CancellationToken ct)
    {
        var preview = await _bookingService.PreviewServiceSelectionAsync(request, ct);
        return Success(preview);
    }

    /// <summary>Tính giá preview cho các dịch vụ đã chọn (trước khi đặt) — "Calculate Booking Price".</summary>
    /// <remarks>
    /// Gọi: BookingService.QuoteAsync → IBookingRepository.GetSlotForReserveAsync → helper BuildLinesAsync
    /// (→ IServiceCatalogRepository.GetByIdAsync + IBranchRepository.GetBranchServiceAsync mỗi dòng)
    /// → helper ResolveAndValidateVoucherAsync (→ IVoucherRepository.GetUserVoucherByIdAsync/GetByCodeAsync/GetUserVoucherAsync)
    /// → ILoyaltyService.GetActiveTierBenefitsAsync → helper ResolveRedeemAsync (→ ILoyaltyService.GetCurrentPointsAsync).
    /// </remarks>
    [HttpPost("quote")]
    public async Task<IActionResult> Quote([FromBody] BookingQuoteRequest request, CancellationToken ct)
    {
        var quote = await _bookingService.QuoteAsync(CurrentUserId, request, ct);
        return Success(quote);
    }

    /// <summary>Tạo booking mới (Pending — chờ thanh toán). Cần header Idempotency-Key.</summary>
    /// <remarks>
    /// Gọi: BookingService.CreateAsync → IVehicleRepository.GetByIdAsync → IBookingRepository.GetSlotForReserveAsync
    /// → ILoyaltyService.GetActiveTierBenefitsAsync → BuildLinesAsync → ResolveAndValidateVoucherAsync → ResolveRedeemAsync
    /// → IVoucherRepository.AddUserVoucherAsync (nếu voucher mới) → IBookingRepository.AddAsync + SaveChangesAsync
    /// (bắt DbUpdateConcurrencyException) → ILoyaltyService.RedeemForBookingAsync (best-effort)
    /// → IEmailService.SendBookingConfirmationEmailAsync (best-effort, qua helper TrySendConfirmationEmailAsync).
    /// </remarks>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.CreateAsync(CurrentUserId, request, ct);
        return Created(nameof(GetById), new { id = booking.BookingId }, booking, "Đặt lịch thành công.");
    }

    /// <summary>Tạo booking cho khách vãng lai tại quầy (Staff) — WalkIn, tạo thẳng CheckedIn (bỏ qua check-in). Cần header Idempotency-Key.</summary>
    /// <remarks>
    /// Gọi: BookingService.CreateWalkInAsync → IUserRepository.GetByIdAsync (khách) → IBookingRepository.GetSlotForReserveAsync
    /// → BuildLinesAsync → ResolveAndValidateVoucherAsync → ILoyaltyService.GetActiveTierBenefitsAsync → ResolveRedeemAsync
    /// → helper ResolveWalkInVehicleAsync (→ IVehicleRepository.GetByIdAsync/ExistsLicensePlateAsync/CreateAsync)
    /// → IBookingRepository.AddAsync + SaveChangesAsync → ILoyaltyService.RedeemForBookingAsync → TrySendConfirmationEmailAsync.
    /// </remarks>
    [HttpPost("walk-in")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> CreateWalkIn([FromBody] CreateWalkInBookingRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.CreateWalkInAsync(CurrentUserId, request, ct);
        return Created(nameof(GetById), new { id = booking.BookingId }, booking, "Tạo booking tại quầy thành công.");
    }

    // ─── Customer Support tại quầy (Staff/Manager/Admin) ──────────────────────
    // "Customer" = User có Role=Customer; logic nằm trong BookingService (slice Booking).

    /// <summary>Tra cứu khách hàng theo SĐT (kèm danh sách xe). Data = null nếu chưa có.</summary>
    /// <remarks>Gọi: BookingService.LookupCustomerByPhoneAsync → IUserRepository.GetByPhoneAsync → IVehicleRepository.GetByUserIdAsync.</remarks>
    [HttpGet("customers/lookup")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> LookupCustomer([FromQuery] string phone, CancellationToken ct)
    {
        var customer = await _bookingService.LookupCustomerByPhoneAsync(phone, ct);
        return Success(customer, customer is null ? "Không tìm thấy khách hàng với số điện thoại này." : null);
    }

    /// <summary>Đăng ký khách vãng lai (guest). Nếu SĐT đã tồn tại thì trả về khách cũ.</summary>
    /// <remarks>
    /// Gọi: BookingService.RegisterWalkInCustomerAsync → IUserRepository.GetByPhoneAsync/GetByEmailAsync → CreateAsync.
    /// </remarks>
    [HttpPost("customers/walk-in")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> RegisterWalkInCustomer([FromBody] RegisterWalkInCustomerRequest request, CancellationToken ct)
    {
        var customer = await _bookingService.RegisterWalkInCustomerAsync(request, ct);
        return Success(customer, "Đăng ký khách vãng lai thành công.");
    }

    /// <summary>Lịch sử booking của 1 khách (lọc theo status/ngày, phân trang) — "Search Customer Booking".</summary>
    /// <remarks>Gọi: BookingService.GetCustomerBookingsAsync → IUserRepository.GetByIdAsync → IBookingRepository.GetMyBookingsPagedAsync.</remarks>
    [HttpGet("customers/{customerId:guid}/bookings")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> GetCustomerBookings(Guid customerId, [FromQuery] BookingQuery query, CancellationToken ct)
    {
        var result = await _bookingService.GetCustomerBookingsAsync(customerId, query, ct);
        return Paged(result);
    }

    /// <summary>Danh sách booking của tôi + lịch sử (lọc theo status/ngày, phân trang).</summary>
    /// <remarks>Gọi: BookingService.GetMyBookingsAsync → IBookingRepository.GetMyBookingsPagedAsync.</remarks>
    [HttpGet("mine")]
    public async Task<IActionResult> GetMine([FromQuery] BookingQuery query, CancellationToken ct)
    {
        var result = await _bookingService.GetMyBookingsAsync(CurrentUserId, query, ct);
        return Paged(result);
    }

    /// <summary>Chi tiết / trạng thái 1 booking. Chủ đơn hoặc Staff/Manager/Admin mới xem được.</summary>
    /// <remarks>Gọi: BookingService.GetByIdAsync → IBookingRepository.GetDetailAsync.</remarks>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var isPrivileged = User.IsInRole(UserRole.Staff) || User.IsInRole(UserRole.Manager) || User.IsInRole(UserRole.Admin);
        var booking = await _bookingService.GetByIdAsync(CurrentUserId, isPrivileged, id, ct);
        return Success(booking);
    }

    /// <summary>Hook cho module Payment: xác nhận đơn sau khi đã thu cọc/đủ → Confirmed.</summary>
    /// <remarks>
    /// Gọi: BookingService.MarkConfirmedAsync → IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.
    /// Cũng được PaymentService gọi trực tiếp (Service→Service) sau khi thanh toán thành công.
    /// </remarks>
    [HttpPost("{id:guid}/confirm")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken ct)
    {
        var booking = await _bookingService.MarkConfirmedAsync(id, ct);
        return Success(booking, "Đã xác nhận thanh toán.");
    }

    /// <summary>Hàng đợi booking của chi nhánh (mặc định hôm nay) — lọc theo status/ngày, tìm theo mã.</summary>
    /// <remarks>
    /// Gọi: BookingService.GetQueueAsync → helper ResolveBranchIdAsync (→ IUserRepository.GetByIdAsync)
    /// → IBookingRepository.GetQueuePagedAsync.
    /// </remarks>
    [HttpGet("queue")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> GetQueue([FromQuery] BookingQuery query, CancellationToken ct)
    {
        var result = await _bookingService.GetQueueAsync(CurrentUserId, query, ct);
        return Paged(result);
    }

    /// <summary>Đổi trạng thái thủ công (Confirmed / InProgress / Closed). Check-in/complete/cancel có endpoint riêng.</summary>
    /// <remarks>
    /// Gọi: BookingService.UpdateStatusAsync → IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.
    /// Chỉ cho phép transition CheckedIn → InProgress (duy nhất không có side-effect).
    /// </remarks>
    [HttpPut("{id:guid}/status")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] UpdateBookingStatusRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.UpdateStatusAsync(id, request.Status, CurrentUserId, ct);
        return Success(booking, "Cập nhật trạng thái thành công.");
    }

    /// <summary>Manager/Admin gán lại nhân viên thực hiện rửa xe cho booking.</summary>
    /// <remarks>
    /// Gọi: BookingService.AssignStaffAsync → IBookingRepository.GetTrackedByIdAsync → IReviewRepository.ExistsForBookingAsync
    /// → IUserRepository.GetByIdAsync (staff + manager) → SaveChangesAsync.
    /// </remarks>
    [HttpPut("{id:guid}/assign-staff")]
    [Authorize(Roles = $"{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> AssignStaff(Guid id, [FromBody] AssignStaffRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.AssignStaffAsync(id, CurrentUserId, request.StaffId, ct);
        return Success(booking, "Đã gán nhân viên rửa xe.");
    }

    /// <summary>Check-in bằng mã QR (hoặc mã booking) khi khách đến — Confirmed → CheckedIn.</summary>
    /// <remarks>
    /// Gọi: BookingService.CheckInAsync → IBookingRepository.GetTrackedByQrAsync/GetTrackedByCodeAsync → SaveChangesAsync.
    /// </remarks>
    [HttpPost("check-in")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> CheckIn([FromBody] CheckInRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.CheckInAsync(CurrentUserId, request, ct);
        return Success(booking, "Check-in thành công.");
    }

    /// <summary>Quét QR để XEM thông tin booking trước khi check-in (read-only, không đổi trạng thái).</summary>
    /// <remarks>Gọi: BookingService.LookupByQrAsync → IBookingRepository.GetDetailByQrAsync.</remarks>
    [HttpGet("by-qr/{token}")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> LookupByQr(string token, CancellationToken ct)
    {
        var booking = await _bookingService.LookupByQrAsync(token, ct);
        return Success(booking);
    }

    /// <summary>Thêm dịch vụ phát sinh khi đang rửa (Staff) — tính lại tổng tiền.</summary>
    /// <remarks>
    /// Gọi: BookingService.AddServiceLineAsync → IBookingRepository.GetTrackedByIdAsync → helper BuildLineAsync
    /// (→ IServiceCatalogRepository.GetByIdAsync + IBranchRepository.GetBranchServiceAsync) → SaveChangesAsync.
    /// </remarks>
    [HttpPost("{id:guid}/lines")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> AddLine(Guid id, [FromBody] AddServiceLineRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.AddServiceLineAsync(id, request, ct);
        return Success(booking, "Đã thêm dịch vụ.");
    }

    /// <summary>Sửa số lượng 1 dòng dịch vụ (Staff) — tính lại tổng tiền.</summary>
    /// <remarks>Gọi: BookingService.UpdateLineAsync → IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.</remarks>
    [HttpPut("{id:guid}/lines/{lineId:guid}")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> UpdateLine(Guid id, Guid lineId, [FromBody] UpdateBookingLineRequest request, CancellationToken ct)
    {
        var booking = await _bookingService.UpdateLineAsync(id, lineId, request, ct);
        return Success(booking, "Đã cập nhật dịch vụ.");
    }

    /// <summary>Xoá 1 dòng dịch vụ (Staff) — tính lại tổng tiền. Không xoá được dịch vụ cuối cùng.</summary>
    /// <remarks>Gọi: BookingService.RemoveLineAsync → IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.</remarks>
    [HttpDelete("{id:guid}/lines/{lineId:guid}")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> RemoveLine(Guid id, Guid lineId, CancellationToken ct)
    {
        var booking = await _bookingService.RemoveLineAsync(id, lineId, ct);
        return Success(booking, "Đã xoá dịch vụ.");
    }

    /// <summary>Hoàn tất rửa xe (Staff) — CheckedIn/InProgress → Completed.</summary>
    /// <remarks>Gọi: BookingService.CompleteAsync → IBookingRepository.GetTrackedByIdAsync → SaveChangesAsync.</remarks>
    [HttpPost("{id:guid}/complete")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> Complete(Guid id, CancellationToken ct)
    {
        var booking = await _bookingService.CompleteAsync(id, CurrentUserId, ct);
        return Success(booking, "Đã hoàn tất rửa xe.");
    }

    /// <summary>Đóng đơn sau khi hoàn tất (Staff) — Completed → Closed.</summary>
    /// <remarks>
    /// Gọi: BookingService.CloseAsync → IBookingRepository.GetTrackedByIdAsync → IPaymentRepository.HasCompletedFullPaymentAsync
    /// → ILoyaltyService.EarnFromBookingAsync (best-effort, tích điểm) → SaveChangesAsync.
    /// Cũng được PaymentService gọi trực tiếp (Service→Service) khi thu đủ tiền lúc booking đã Completed.
    /// </remarks>
    [HttpPost("{id:guid}/close")]
    [Authorize(Roles = $"{UserRole.Staff},{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> Close(Guid id, CancellationToken ct)
    {
        var booking = await _bookingService.CloseAsync(id, ct);
        return Success(booking, "Đã đóng đơn.");
    }

    /// <summary>Huỷ đơn trước check-in (chủ đơn hoặc Staff/Manager) — nhả slot, không hoàn tiền.</summary>
    /// <remarks>
    /// Gọi: BookingService.CancelAsync → IBookingRepository.GetTrackedByIdAsync → IVoucherRepository.GetUserVoucherByIdAsync
    /// (hoàn voucher) → SaveChangesAsync → ILoyaltyService.EarnFromCancelledBookingAsync + IBranchRepository.GetByIdAsync
    /// + IEmailService.SendManagerBookingCancelledNotificationEmailAsync (best-effort, chỉ khi đã có cọc).
    /// </remarks>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, [FromBody] CancelBookingRequest? request, CancellationToken ct)
    {
        var isPrivileged = User.IsInRole(UserRole.Staff) || User.IsInRole(UserRole.Manager) || User.IsInRole(UserRole.Admin);
        var booking = await _bookingService.CancelAsync(CurrentUserId, isPrivileged, id, request, ct);
        return Success(booking, "Đã huỷ đơn.");
    }
}
