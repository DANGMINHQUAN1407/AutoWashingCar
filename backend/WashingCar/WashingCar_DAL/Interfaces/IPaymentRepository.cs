using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Payment;

namespace WashingCar_DAL.Interfaces;

public interface IPaymentRepository
{
    Task AddAsync(Payment payment, CancellationToken ct = default);

    /// <summary>Payment (tracked) kèm TenderAllocations — để cập nhật trạng thái.</summary>
    Task<Payment?> GetTrackedByIdAsync(Guid paymentId, CancellationToken ct = default);

    /// <summary>Payment (tracked) theo mã giao dịch VNPay (vnp_TxnRef) — cho Return/IPN.</summary>
    Task<Payment?> GetTrackedByTransactionCodeAsync(string transactionCode, CancellationToken ct = default);

    /// <summary>Chi tiết payment (AsNoTracking) kèm tenders + booking.</summary>
    Task<Payment?> GetDetailAsync(Guid paymentId, CancellationToken ct = default);

    Task<bool> ExistsTransactionCodeAsync(string transactionCode, CancellationToken ct = default);

    /// <summary>Booking còn payment Pending hoặc Completed, tức chưa an toàn để auto-expire.</summary>
    Task<bool> HasPendingOrCompletedPaymentAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Refresh scalar state của payment sau khi đã lấy application lock.</summary>
    Task ReloadAsync(Payment payment, CancellationToken ct = default);

    /// <summary>Tổng tiền đã thanh toán (Completed, không tính Refund) của 1 booking — để tính phần còn lại.</summary>
    Task<decimal> GetCompletedAmountAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Các payment Completed có thể làm nguồn hoàn tiền, không bao gồm Refund.</summary>
    Task<List<Payment>> GetCompletedPaymentsForRefundAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Payment Pending của booking để hủy giao dịch chưa hoàn tất cùng lúc với Cancel.</summary>
    Task<List<Payment>> GetTrackedPendingPaymentsAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Tổng số tiền Refund Completed đã ghi cho một payment gốc.</summary>
    Task<decimal> GetRefundedAmountAsync(Guid originalPaymentId, CancellationToken ct = default);

    /// <summary>Booking có payment Completed loại FullPayment (thanh toán 100% 1 lần, không qua cọc) không — dùng để cộng bonus điểm loyalty.</summary>
    Task<bool> HasCompletedFullPaymentAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Danh sách payment lọc + phân trang. ownerUserId lọc theo khách; branchId lọc theo chi nhánh của actor privileged.</summary>
    Task<(List<Payment> Items, int TotalCount)> GetPagedAsync(
        PaymentQuery query,
        Guid? ownerUserId,
        Guid? branchId = null,
        CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
