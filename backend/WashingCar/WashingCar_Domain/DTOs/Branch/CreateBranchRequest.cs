using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Branch;

public class CreateBranchRequest
{
    [Required, StringLength(200)]
    public string Name { get; set; } = null!;

    [Required, StringLength(300)]
    public string Address { get; set; } = null!;

    [Required, StringLength(100)]
    public string City { get; set; } = null!;

    [Required, Phone, StringLength(20)]
    public string Phone { get; set; } = null!;

    [EmailAddress, StringLength(255)]
    public string? Email { get; set; }

    [Range(-90, 90)]
    public decimal? Latitude { get; set; }

    [Range(-180, 180)]
    public decimal? Longitude { get; set; }

    public TimeOnly OpenTime { get; set; }
    public TimeOnly CloseTime { get; set; }
}
