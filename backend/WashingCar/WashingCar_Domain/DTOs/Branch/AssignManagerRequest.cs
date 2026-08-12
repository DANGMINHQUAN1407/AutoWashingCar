using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Branch;

public class AssignManagerRequest
{
    [Required]
    public Guid UserId { get; set; }
}
