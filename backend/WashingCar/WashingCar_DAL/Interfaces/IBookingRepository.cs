using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Booking;

namespace WashingCar_DAL.Interfaces;

public interface IBookingRepository
{
    Task AddAsync(Booking booking, CancellationToken ct = default);

    /// <summary>Lấy booking (tracked) kèm BookingLines + SlotInventory để cập nhật.</summary>
    Task<Booking?> GetTrackedByIdAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Lấy slot (tracked) để tăng/giảm reserved-count khi giữ/nhả chỗ.</summary>
    Task<SlotInventory?> GetSlotForReserveAsync(Guid slotId, CancellationToken ct = default);

    Task<bool> ExistsCodeAsync(string bookingCode, CancellationToken ct = default);
    Task<bool> ExistsQrAsync(string qrToken, CancellationToken ct = default);

    /// <summary>Chi tiết booking (AsNoTracking) kèm lines + slot + khách + xe — cho xem chi tiết.</summary>
    Task<Booking?> GetDetailAsync(Guid bookingId, CancellationToken ct = default);

    /// <summary>Chi tiết booking theo mã QR (AsNoTracking, read-only) — quét để XEM, không đổi trạng thái.</summary>
    Task<Booking?> GetDetailByQrAsync(string qrToken, CancellationToken ct = default);

    /// <summary>Danh sách booking của 1 khách, có lọc + phân trang.</summary>
    Task<(List<Booking> Items, int TotalCount)> GetMyBookingsPagedAsync(
        Guid userId, BookingQuery query, CancellationToken ct = default);

    /// <summary>Hàng đợi booking theo chi nhánh, lọc + phân trang (sắp theo giờ slot).</summary>
    Task<(List<Booking> Items, int TotalCount)> GetQueuePagedAsync(
        Guid branchId, BookingQuery query, CancellationToken ct = default);

    /// <summary>Tra booking (tracked, kèm lines+slot) theo mã QR check-in.</summary>
    Task<Booking?> GetTrackedByQrAsync(string qrToken, CancellationToken ct = default);

    /// <summary>Tra booking (tracked, kèm lines+slot) theo mã booking.</summary>
    Task<Booking?> GetTrackedByCodeAsync(string bookingCode, CancellationToken ct = default);

    /// <summary>Booking Confirmed chưa gửi nhắc, có slot trong [fromDate..toDate] (tracked, kèm User+Slot+Branch) — cho job nhắc lịch.</summary>
    Task<List<Booking>> GetRemindableAsync(DateOnly fromDate, DateOnly toDate, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
    Task<int> GetTotalBookingsCountAsync(CancellationToken ct = default);
    Task<int> GetBranchBookingsCountAsync(Guid branchId, CancellationToken ct = default);

    /// <summary>Booking thô (chỉ BookingType/BookingFinalAmount/CreatedAtUtc) cho báo cáo thống kê theo kỳ.</summary>
    Task<List<Booking>> GetForStatsAsync(
        Guid? branchId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct = default);
}
