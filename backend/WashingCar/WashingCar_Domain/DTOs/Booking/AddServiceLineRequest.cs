using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

public class AddServiceLineRequest
{
    [Required] public Guid  ServiceCatalogItemId { get; set; }
    [Range(1, 50)] public short Quantity { get; set; } = 1;
}
