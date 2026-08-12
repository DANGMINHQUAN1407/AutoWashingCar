using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Branch;

public class AssignStaffRequest
{
    [Required, MinLength(1)]
    public List<Guid> UserIds { get; set; } = [];
}
