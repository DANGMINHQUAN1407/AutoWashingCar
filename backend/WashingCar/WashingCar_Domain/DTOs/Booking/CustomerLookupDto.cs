using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_Domain.DTOs.Booking;

/// <summary>
/// Thông tin khách hàng (User có Role=Customer) phục vụ Staff tra cứu / đăng ký tại quầy,
/// kèm danh sách xe để chọn khi tạo walk-in booking. Thuộc slice Booking (Staff Operations).
/// </summary>
public class CustomerLookupDto
{
    public Guid    UserId      { get; set; }
    public string  FullName    { get; set; } = null!;
    public string? PhoneNumber { get; set; }
    public string? Email       { get; set; }
    public bool    IsGuest     { get; set; }

    public List<VehicleDto> Vehicles { get; set; } = new();
}
