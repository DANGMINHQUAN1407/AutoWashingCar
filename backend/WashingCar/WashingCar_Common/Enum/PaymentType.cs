namespace WashingCar_Common.Enum;

// Khớp CK_Payment_Type trong database/WashingCar.sql
public static class PaymentType
{
    public const byte Deposit     = 1;  // Đặt cọc (vd 50%, online qua VNPay)
    public const byte Remaining   = 2;  // Thanh toán phần còn lại sau khi đã cọc (gồm cả service phát sinh)
    public const byte FullPayment = 3;  // Thanh toán đủ 100% trong 1 lần (không cọc trước)
    public const byte Refund      = 4;  // Hoàn tiền — row riêng, ngoài phạm vi hiện tại
}
