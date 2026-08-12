using System.ComponentModel.DataAnnotations;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_Domain.DTOs.Booking;

/// <summary>
/// Staff tạo booking cho khách vãng lai tại quầy. Khách (CustomerId) đã được
/// lookup/đăng ký trước. Xe: chọn xe có sẵn (ExistingVehicleId) hoặc khai báo xe mới (NewVehicle).
/// </summary>
public class CreateWalkInBookingRequest
{
    [Required] public Guid CustomerId      { get; set; }
    [Required] public Guid SlotInventoryId { get; set; }

    [MinLength(1, ErrorMessage = "Phải chọn ít nhất 1 dịch vụ")]
    public List<BookingServiceSelection> Services { get; set; } = [];
    public byte RedeemMode { get; set; }
    public int RedeemPoints { get; set; }
    public Guid? UserVoucherId { get; set; }
    public string? VoucherCode { get; set; }

    /// <summary>Xe có sẵn của khách (ưu tiên nếu có giá trị).</summary>
    public Guid? ExistingVehicleId { get; set; }

    /// <summary>Khai báo xe mới (ad-hoc) khi khách chưa có xe trong hệ thống.</summary>
    public CreateVehicleRequest? NewVehicle { get; set; }
}
