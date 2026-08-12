namespace WashingCar_Common.Settings;

// Bind từ section "VnPay" trong appsettings.json
public class VnPaySettings
{
    public string TmnCode    { get; set; } = null!;  // Mã merchant sandbox
    public string HashSecret { get; set; } = null!;  // Khoá ký HMAC-SHA512
    public string BaseUrl    { get; set; } = null!;  // https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
    public string ReturnUrl  { get; set; } = null!;  // Trỏ về /api/payments/vnpay/return
    public string Version    { get; set; } = "2.1.0";
    public string Command    { get; set; } = "pay";
    public string CurrCode   { get; set; } = "VND";
    public string Locale     { get; set; } = "vn";
}
