using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Payment;

/// <summary>Thanh toán phần còn lại tại quầy (Staff). Tổng các tender phải bằng số tiền còn lại.</summary>
public class CreateFinalPaymentRequest
{
    [Required] public Guid BookingId { get; set; }

    [MinLength(1, ErrorMessage = "Cần ít nhất 1 phương thức thanh toán")]
    public List<TenderInputDto> Tenders { get; set; } = [];
}
