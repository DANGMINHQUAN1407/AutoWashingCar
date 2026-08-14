using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

public class BookingQuoteRequest
{
    /// <summary>Xe của khách để tính phụ thu theo tình trạng; để trống thì không áp phụ thu.</summary>
    public Guid? VehicleId { get; set; }

    [Required] public Guid SlotInventoryId { get; set; }
    public Guid? UserVoucherId { get; set; }
    public string? VoucherCode { get; set; }
    public byte RedeemMode { get; set; }
    public int RedeemPoints { get; set; }

    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 dịch vụ")]
    public List<BookingServiceSelection> Services { get; set; } = [];
}
