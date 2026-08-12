namespace WashingCar_Domain.DTOs.Payment;

/// <summary>Kết quả parse callback VNPay (ReturnUrl) để hiển thị cho khách.</summary>
public class VnPayReturnDto
{
    public bool   Success      { get; set; }
    public string ResponseCode { get; set; } = "";  // vnp_ResponseCode (00 = thành công)
    public string Message      { get; set; } = "";
    public Guid?  PaymentId    { get; set; }
}
