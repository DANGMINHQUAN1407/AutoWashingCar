namespace WashingCar_Domain.DTOs.Slot;

public class SlotQuery
{
    public DateOnly? FromDate { get; set; }
    public DateOnly? ToDate   { get; set; }
    public Guid?     BranchId { get; set; }  // Admin dùng; Manager tự lấy từ token
    public int       Page     { get; set; } = 1;
    public int       PageSize { get; set; } = 50;
}
