using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Loyalty;

public class AdjustPointsRequest
{
    [Required]
    public Guid UserId { get; set; }

    public int Points { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }
}
