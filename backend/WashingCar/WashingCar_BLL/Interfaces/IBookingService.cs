using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Booking;

namespace WashingCar_BLL.Interfaces;

public interface IBookingService
{
    /// <summary>
    /// Normalize selection parent-child và trả trạng thái checkbox trước khi tính giá.
    /// Không đọc slot/vehicle/voucher và không ghi database.
    /// </summary>
    Task<ServiceSelectionPreviewDto> PreviewServiceSelectionAsync(
        ServiceSelectionPreviewRequest request,
        CancellationToken ct = default);

    /// <summary>Tính giá preview (lines + subtotal + final) trước khi đặt — "Calculate Booking Price".</summary>
    Task<BookingQuoteDto> QuoteAsync(Guid userId, BookingQuoteRequest request, CancellationToken ct = default);

    /// <summary>Tạo booking: snapshot giá, sinh code+QR, giữ slot, gửi email. Trạng thái khởi tạo = Pending.</summary>
    Task<BookingDto> CreateAsync(Guid userId, CreateBookingRequest request, CancellationToken ct = default);

    /// <summary>Staff tạo booking cho khách vãng lai tại quầy: WalkIn, giữ chỗ walk-in, xe có sẵn/ad-hoc, tạo thẳng CheckedIn (bỏ qua check-in).</summary>
    Task<BookingDto> CreateWalkInAsync(Guid staffId, CreateWalkInBookingRequest request, CancellationToken ct = default);

    // ─── Customer Support tại quầy (Staff đặt hộ khách walk-in) ───────────────

    /// <summary>Tra cứu khách theo SĐT (kèm danh sách xe). Null nếu chưa có.</summary>
    Task<CustomerLookupDto?> LookupCustomerByPhoneAsync(string phone, CancellationToken ct = default);

    /// <summary>Đăng ký khách vãng lai (guest). Nếu SĐT đã tồn tại thì tái dùng khách cũ.</summary>
    Task<CustomerLookupDto> RegisterWalkInCustomerAsync(RegisterWalkInCustomerRequest request, CancellationToken ct = default);

    /// <summary>Lịch sử booking của 1 khách — lọc + phân trang ("Search Customer Booking").</summary>
    Task<PagedResult<BookingListItemDto>> GetCustomerBookingsAsync(Guid customerId, BookingQuery query, CancellationToken ct = default);

    /// <summary>Hook cho module Payment: sau khi thu cọc/đủ → chuyển Pending sang Confirmed.</summary>
    Task<BookingDto> MarkConfirmedAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Danh sách booking của khách (own bookings + history) — lọc + phân trang.</summary>
    Task<PagedResult<BookingListItemDto>> GetMyBookingsAsync(Guid userId, BookingQuery query, CancellationToken ct = default);

    /// <summary>Chi tiết booking. Chỉ chủ đơn hoặc Staff/Manager/Admin (isPrivileged) mới xem được.</summary>
    Task<BookingDto> GetByIdAsync(Guid currentUserId, bool isPrivileged, Guid bookingId, CancellationToken ct = default);

    /// <summary>Hàng đợi booking của chi nhánh (mặc định hôm nay) — Get Today's Queue + filter + search.</summary>
    Task<PagedResult<BookingListItemDto>> GetQueueAsync(Guid currentUserId, BookingQuery query, CancellationToken ct = default);

    /// <summary>Đổi trạng thái thủ công (các bước "phẳng" không side-effect). Side-effect dùng endpoint riêng.
    /// Khi chuyển sang InProgress ("Start Wash"), tự gán staffId làm AssignedStaffId nếu chưa có ai được gán.</summary>
    Task<BookingDto> UpdateStatusAsync(Guid bookingId, byte newStatus, Guid staffId, CancellationToken ct = default);

    /// <summary>Check-in bằng mã QR (hoặc mã booking): validate + ghi giờ + nhân viên, Confirmed → CheckedIn.</summary>
    Task<BookingDto> CheckInAsync(Guid staffId, CheckInRequest request, CancellationToken ct = default);

    /// <summary>Quét QR để XEM thông tin booking (read-only) — không đổi trạng thái.</summary>
    Task<BookingDto> LookupByQrAsync(string qrToken, CancellationToken ct = default);

    /// <summary>Thêm 1 dịch vụ vào booking (Add Additional Service) + tính lại tổng.</summary>
    Task<BookingDto> AddServiceLineAsync(Guid bookingId, AddServiceLineRequest request, CancellationToken ct = default);

    /// <summary>Sửa số lượng 1 dòng dịch vụ (Update Booking Line) + tính lại tổng.</summary>
    Task<BookingDto> UpdateLineAsync(Guid bookingId, Guid lineId, UpdateBookingLineRequest request, CancellationToken ct = default);

    /// <summary>Xoá 1 dòng dịch vụ (Remove Booking Line) + tính lại tổng. Không xoá được dòng cuối cùng.</summary>
    Task<BookingDto> RemoveLineAsync(Guid bookingId, Guid lineId, CancellationToken ct = default);

    /// <summary>Hoàn tất rửa (Complete Wash): CheckedIn/InProgress → Completed, ghi CompletedAtUtc.
    /// Gán staffId làm AssignedStaffId nếu chưa có ai được gán (lưới an toàn cho case bỏ qua InProgress, ví dụ WalkIn).</summary>
    Task<BookingDto> CompleteAsync(Guid bookingId, Guid staffId, CancellationToken ct = default);

    /// <summary>Manager/Admin gán lại nhân viên rửa xe cho 1 booking (luôn ghi đè, khác self-claim chỉ set khi null).
    /// Cho phép cả sau khi Completed/Closed, miễn là chưa có Review nào cho booking (tránh sai lệch dữ liệu rating).</summary>
    Task<BookingDto> AssignStaffAsync(Guid bookingId, Guid managerId, Guid targetStaffId, CancellationToken ct = default);

    /// <summary>Đóng đơn (Close Booking): Completed → Closed. Seam loyalty/payment.</summary>
    Task<BookingDto> CloseAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Huỷ đơn (trước check-in): nhả slot, KHÔNG hoàn tiền. Chủ đơn hoặc Staff/Manager/Admin.</summary>
    Task<BookingDto> CancelAsync(Guid userId, bool isPrivileged, Guid bookingId, CancelBookingRequest? request, CancellationToken ct = default);

    /// <summary>Quét & gửi email nhắc lịch cho booking Confirmed có slot bắt đầu trong ~1 giờ tới. Trả về số mail đã gửi. (Background job gọi.)</summary>
    Task<int> SendDueRemindersAsync(CancellationToken ct = default);
}
