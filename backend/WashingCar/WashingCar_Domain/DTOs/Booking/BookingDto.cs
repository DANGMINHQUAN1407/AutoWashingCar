namespace WashingCar_Domain.DTOs.Booking;

public class BookingDto
{
    public Guid   BookingId     { get; set; }
    public string BookingCode   { get; set; } = null!;
    public string CheckInQrCode { get; set; } = null!;
    public byte   BookingType   { get; set; }
    public byte   BookingStatus { get; set; }

    public Guid UserId          { get; set; }
    public Guid VehicleId       { get; set; }
    public Guid BranchId        { get; set; }
    public Guid SlotInventoryId { get; set; }
    public Guid? UserVoucherId  { get; set; }

    // Thông tin khách + xe (điền khi load kèm User/Vehicle) — phục vụ màn check-in
    public string? CustomerName  { get; set; }
    public string? CustomerPhone { get; set; }
    public string? LicensePlate  { get; set; }
    public byte?   VehicleType   { get; set; }
    public string? VehicleBrand  { get; set; }

    // Thông tin slot (điền khi load kèm SlotInventory) — tiện hiển thị
    public DateOnly? SlotDate      { get; set; }
    public TimeOnly? SlotStartTime { get; set; }
    public TimeOnly? SlotEndTime   { get; set; }

    public decimal  ServiceSubtotal       { get; set; }
    public string   VehicleConditionAtBooking { get; set; } = null!;
    public decimal  VehicleSurchargeRate  { get; set; }
    public decimal  VehicleSurchargeAmount { get; set; }
    public decimal  BookingSubtotal       { get; set; }
    public decimal  BookingDiscountAmount { get; set; }
    public decimal  BookingFinalAmount    { get; set; }
    public decimal? DepositAmount         { get; set; }

    // Kết quả tính tại thời điểm hủy; không lưu thêm column vào Booking.
    public decimal  PaidAmountAtCancellation { get; set; }
    public decimal  CancellationFeeRate       { get; set; }
    public decimal  CancellationFeeAmount     { get; set; }
    public decimal  RefundAmount              { get; set; }

    public int      EarnedPoints          { get; set; }
    public int      RedeemedPoints        { get; set; }

    public DateTime? CheckInAtUtc        { get; set; }
    public Guid?     CheckedInByUserId   { get; set; }
    public Guid?     AssignedStaffId     { get; set; }
    public string?   AssignedStaffName   { get; set; }
    public DateTime? AssignedAtUtc       { get; set; }
    public DateTime? CompletedAtUtc      { get; set; }
    public DateTime  CreatedAtUtc        { get; set; }

    public int       TotalDurationMinutes { get; set; }
    public DateTime? ExpectedFinishAtUtc  { get; set; }

    public List<BookingLineDto> Lines { get; set; } = new();
}
