namespace WashingCar_Common.Enum;

public static class VoucherApprovalStatus
{
    public const byte Pending  = 1;  // Chờ duyệt (default)
    public const byte Approved = 2;  // Đã duyệt
    public const byte Rejected = 3;  // Từ chối
}
