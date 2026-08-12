namespace WashingCar_Common.Enum;

// Khớp CK_Payment_Status trong database/WashingCar.sql
public static class PaymentStatus
{
    public const byte Pending   = 1;  // Vừa khởi tạo, chờ kết quả thanh toán
    public const byte Completed = 2;  // Đã thu tiền thành công
    public const byte Failed    = 3;  // Thanh toán thất bại / cổng từ chối
    public const byte Cancelled = 4;  // Khách huỷ giao dịch
}
