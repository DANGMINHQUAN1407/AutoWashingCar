namespace WashingCar_Common.Enum;

// Khớp CK_Payment_Method trong database/WashingCar.sql (VNPay được xếp vào EWallet)
public static class PaymentMethod
{
    public const byte Cash          = 1;  // Tiền mặt tại quầy
    public const byte Card          = 2;  // Thẻ (POS tại quầy)
    public const byte EWallet       = 3;  // Ví điện tử / cổng VNPay
    public const byte LoyaltyPoints = 4;  // Trừ điểm tích luỹ — chờ module Loyalty
}
