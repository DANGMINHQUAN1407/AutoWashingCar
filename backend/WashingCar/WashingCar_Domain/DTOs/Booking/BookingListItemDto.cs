namespace WashingCar_Domain.DTOs.Booking;

/// <summary>Bản nhẹ cho danh sách / hàng đợi / lịch sử.</summary>
public class BookingListItemDto
{
    public Guid BookingId { get; set; }
    public string BookingCode { get; set; } = null!;
    public byte BookingType { get; set; }
    public byte BookingStatus { get; set; }
    public Guid VehicleId { get; set; }
    public Guid BranchId { get; set; }
    public DateOnly? SlotDate { get; set; }
    public TimeOnly? SlotStartTime { get; set; }
    public decimal BookingFinalAmount { get; set; }
    public decimal BookingDiscountAmount { get; set; }
    public decimal VehicleSurchargeAmount { get; set; }
    public decimal? DepositAmount { get; set; }
    public int RedeemedPoints { get; set; }
    public DateTime CreatedAtUtc { get; set; }

    // Thông tin hiển thị trên kanban / danh sách
    public string? LicensePlate { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
    public string? ServiceSummary { get; set; } // Tên dịch vụ cách nhau bởi ", "

    public Guid?   AssignedStaffId { get; set; }
    public string? AssignedStaffName { get; set; }

    public int       TotalDurationMinutes { get; set; }
    public DateTime? ExpectedFinishAtUtc  { get; set; }
}