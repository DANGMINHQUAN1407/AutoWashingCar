namespace WashingCar_Common.Enum;

public static class BookingStatus
{
    public const byte Pending    = 1;  // Vừa tạo, chờ thanh toán (slot đã giữ)
    public const byte Confirmed  = 2;  // Đã thanh toán cọc/đủ → xác nhận
    public const byte CheckedIn  = 3;  // Khách đã đến, đã check-in
    public const byte InProgress = 4;  // Đang rửa xe
    public const byte Completed  = 5;  // Rửa xong
    public const byte Closed     = 6;  // Đã chốt đơn (thanh toán đủ)
    public const byte Cancelled  = 7;  // Đã huỷ
    public const byte NoShow     = 8;  // Khách không đến (để dành)
}
