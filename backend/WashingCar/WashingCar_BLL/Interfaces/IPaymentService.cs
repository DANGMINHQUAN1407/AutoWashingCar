using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Payment;

namespace WashingCar_BLL.Interfaces;

public interface IPaymentService
{
    /// <summary>Khởi tạo thanh toán online qua VNPay (cọc theo % hoặc trả đủ) → trả URL redirect.</summary>
    Task<DepositInitResponseDto> CreateDepositAsync(
        Guid userId, CreateDepositRequest request, string clientIp, CancellationToken ct = default);

    /// <summary>Xử lý ReturnUrl (trình duyệt quay về) — verify chữ ký + cập nhật trạng thái (idempotent).</summary>
    Task<VnPayReturnDto> HandleVnPayReturnAsync(
        IDictionary<string, string> vnpParams, CancellationToken ct = default);

    /// <summary>Xử lý IPN (server-to-server) — nguồn cập nhật chính thức; trả chuỗi JSON theo chuẩn VNPay.</summary>
    Task<string> HandleVnPayIpnAsync(
        IDictionary<string, string> vnpParams, CancellationToken ct = default);

    /// <summary>Tạo QR VNPay tại quầy cho staff — khách quét thanh toán phần còn lại.</summary>
    Task<DepositInitResponseDto> CreateCounterQrAsync(
        Guid staffId, CreateCounterQrRequest request, string clientIp, CancellationToken ct = default);

    /// <summary>Thu phần còn lại tại quầy (Staff): tạo Payment(Completed) + các TenderAllocation.</summary>
    Task<PaymentDto> CreateFinalPaymentAsync(
        Guid staffId, CreateFinalPaymentRequest request, CancellationToken ct = default);

    /// <summary>Chi tiết 1 giao dịch — chủ đơn hoặc Staff/Manager/Admin.</summary>
    Task<PaymentDto> GetByIdAsync(
        Guid currentUserId, bool isPrivileged, Guid paymentId, CancellationToken ct = default);

    /// <summary>Lịch sử thanh toán của khách đang đăng nhập (lọc + phân trang).</summary>
    Task<PagedResult<PaymentListItemDto>> GetMyPaymentsAsync(
        Guid userId, PaymentQuery query, CancellationToken ct = default);

    /// <summary>Lịch sử thanh toán toàn hệ thống (Staff/Manager/Admin) — lọc theo booking/status…</summary>
    Task<PagedResult<PaymentListItemDto>> GetPaymentsAsync(
        PaymentQuery query, CancellationToken ct = default);
}
