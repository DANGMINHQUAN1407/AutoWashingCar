namespace WashingCar_Common.Settings;

// Bind từ section "Payment" trong appsettings.json
public class PaymentSettings
{
    public int DepositPercent { get; set; } = 50;  // % đặt cọc mặc định khi không trả đủ 100%
}
