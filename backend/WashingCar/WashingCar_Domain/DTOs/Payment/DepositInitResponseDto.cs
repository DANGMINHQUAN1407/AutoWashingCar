namespace WashingCar_Domain.DTOs.Payment;

/// <summary>Kết quả khởi tạo thanh toán: client redirect trình duyệt sang PaymentUrl.</summary>
public class DepositInitResponseDto
{
    public Guid   PaymentId       { get; set; }
    public string TransactionCode { get; set; } = null!;
    public string PaymentUrl      { get; set; } = null!;
}
