using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

public class BookingQuoteRequest
{
    [Required] public Guid SlotInventoryId { get; set; }
    public Guid? UserVoucherId { get; set; }
    public string? VoucherCode { get; set; }
    public byte RedeemMode { get; set; }
    public int RedeemPoints { get; set; }

    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 dịch vụ")]
    public List<BookingServiceSelection> Services { get; set; } = [];
}
