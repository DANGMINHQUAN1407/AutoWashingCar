using WashingCar_Common.Enum;
using WashingCar_Common.Helpers;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Booking;

namespace WashingCar_BLL.Mappers;

public static class BookingMapper
{
    // Tổng thời gian dự kiến + giờ dự kiến hoàn thành (không cần cột DB, tính thuần từ dữ liệu đã có).
    private static (int TotalMinutes, DateTime? ExpectedFinishAtUtc) ComputeDuration(Booking b)
    {
        var total = b.BookingLines.Sum(l => l.DurationMinutes * l.Quantity);
        if (total <= 0) return (0, null);

        // Đã Completed/Closed thì dùng CompletedAtUtc (có sẵn) làm mốc hoàn tất thật;
        // Cancelled/NoShow thì không có ước tính nào cả.
        if (b.BookingStatus is BookingStatus.Completed or BookingStatus.Closed
                            or BookingStatus.Cancelled or BookingStatus.NoShow)
            return (total, null);

        // Ưu tiên AssignedAtUtc (lúc thực sự bắt đầu rửa, self-claim lúc Start Wash) vì
        // CheckInAtUtc chỉ là lúc khách đến quầy, bỏ qua thời gian chờ hàng đợi nếu tiệm đang bận.
        // Chưa ai nhận việc thì fallback về giờ bắt đầu slot như ước tính thô ban đầu.
        var baseUtc = b.AssignedAtUtc
            ?? (b.SlotInventory != null
                ? VietnamTimeHelper.SlotStartToUtc(b.SlotInventory.SlotDate, b.SlotInventory.SlotStartTime)
                : (DateTime?)null);

        return (total, baseUtc?.AddMinutes(total));
    }

    public static BookingLineDto ToDto(this BookingLine line) => new()
    {
        BookingLineId = line.BookingLineId,
        ServiceCatalogItemId = line.ServiceCatalogItemId,
        ServiceName = line.ServiceName,
        UnitPrice = line.UnitPrice,
        DurationMinutes = line.DurationMinutes,
        Quantity = line.Quantity,
        LineTotal = line.LineTotal,
    };

    public static BookingDto ToDto(this Booking b)
    {
        var (totalMinutes, expectedFinish) = ComputeDuration(b);
        return new()
        {
            BookingId = b.BookingId,
            BookingCode = b.BookingCode,
            CheckInQrCode = b.CheckInQrCode,
            BookingType = b.BookingType,
            BookingStatus = b.BookingStatus,
            UserId = b.UserId,
            VehicleId = b.VehicleId,
            BranchId = b.BranchId,
            SlotInventoryId = b.SlotInventoryId,
            UserVoucherId = b.UserVoucherId,
            SlotDate = b.SlotInventory?.SlotDate,
            SlotStartTime = b.SlotInventory?.SlotStartTime,
            SlotEndTime = b.SlotInventory?.SlotEndTime,
            CustomerName = b.User?.FullName,
            CustomerPhone = b.User?.PhoneNumber,
            LicensePlate = b.Vehicle?.LicensePlate,
            VehicleType = b.Vehicle?.VehicleType,
            VehicleBrand = b.Vehicle?.Brand,
            BookingSubtotal = b.BookingSubtotal,
            BookingDiscountAmount = b.BookingDiscountAmount,
            BookingFinalAmount = b.BookingFinalAmount,
            DepositAmount = b.DepositAmount,
            EarnedPoints = b.EarnedPoints,
            RedeemedPoints = b.RedeemedPoints,
            CheckInAtUtc = b.CheckInAtUtc,
            CheckedInByUserId = b.CheckedInByUserId,
            AssignedStaffId = b.AssignedStaffId,
            AssignedStaffName = b.AssignedStaff?.FullName,
            AssignedAtUtc = b.AssignedAtUtc,
            CompletedAtUtc = b.CompletedAtUtc,
            CreatedAtUtc = b.CreatedAtUtc,
            TotalDurationMinutes = totalMinutes,
            ExpectedFinishAtUtc = expectedFinish,
            Lines = b.BookingLines.Select(l => l.ToDto()).ToList(),
        };
    }

    public static BookingListItemDto ToListItemDto(this Booking b)
    {
        var (totalMinutes, expectedFinish) = ComputeDuration(b);
        return new()
        {
            BookingId = b.BookingId,
            BookingCode = b.BookingCode,
            BookingType = b.BookingType,
            BookingStatus = b.BookingStatus,
            VehicleId = b.VehicleId,
            BranchId = b.BranchId,
            SlotDate = b.SlotInventory?.SlotDate,
            SlotStartTime = b.SlotInventory?.SlotStartTime,
            BookingFinalAmount = b.BookingFinalAmount,
            BookingDiscountAmount = b.BookingDiscountAmount,
            DepositAmount = b.DepositAmount,
            RedeemedPoints = b.RedeemedPoints,
            CreatedAtUtc = b.CreatedAtUtc,
            LicensePlate = b.Vehicle?.LicensePlate,
            CustomerName = b.User?.FullName,
            CustomerPhone = b.User?.PhoneNumber,
            ServiceSummary = b.BookingLines.Count > 0
                ? string.Join(", ", b.BookingLines.Select(l => l.ServiceName))
                : null,
            AssignedStaffId = b.AssignedStaffId,
            AssignedStaffName = b.AssignedStaff?.FullName,
            TotalDurationMinutes = totalMinutes,
            ExpectedFinishAtUtc = expectedFinish,
        };
    }

    // Customer Support (Staff Operations) — "Customer" = User có Role=Customer.
    public static CustomerLookupDto ToCustomerLookupDto(this User u, IEnumerable<Vehicle> vehicles) => new()
    {
        UserId = u.UserId,
        FullName = u.FullName,
        PhoneNumber = u.PhoneNumber,
        Email = u.Email,
        IsGuest = u.IsGuest,
        Vehicles = [.. vehicles.Select(v => v.ToDto())],
    };
}