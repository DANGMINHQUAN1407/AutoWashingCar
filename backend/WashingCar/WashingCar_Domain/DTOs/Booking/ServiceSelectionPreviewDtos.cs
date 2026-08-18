using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

/// <summary>
/// Payload nhẹ để xem trước selection parent-child trước khi tạo quote/booking.
/// Không cần slot, vehicle, voucher hoặc loyalty data.
/// </summary>
public class ServiceSelectionPreviewRequest
{
    [Required]
    public List<BookingServiceSelection> Services { get; set; } = new();
}

/// <summary>
/// Kết quả normalize selection. Booking vẫn tiếp tục dùng danh sách Services cũ;
/// DTO này chỉ giúp frontend biết leaf cuối cùng và trạng thái checkbox của từng node.
/// </summary>
public class ServiceSelectionPreviewDto
{
    public List<BookingServiceSelection> NormalizedLeafSelections { get; set; } = new();
    public List<ServiceSelectionStateDto> States { get; set; } = new();
    public int SelectedLeafCount { get; set; }
}

public class ServiceSelectionStateDto
{
    public Guid ServiceCatalogItemId { get; set; }
    public Guid? ParentServiceCatalogItemId { get; set; }
    public byte ServiceNodeType { get; set; }
    public bool IsChecked { get; set; }
    public bool IsIndeterminate { get; set; }
    public int SelectedChildCount { get; set; }
    public int ActiveChildCount { get; set; }
    public bool IsBookable { get; set; }
}
