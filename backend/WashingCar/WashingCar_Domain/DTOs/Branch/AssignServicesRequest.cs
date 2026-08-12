using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Branch;

public class AssignServicesRequest
{
    [Required, MinLength(1)]
    public List<Guid> ServiceCatalogItemIds { get; set; } = new();
}
