using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.User;

public class CreateUserRequest
{
    [Required, StringLength(200)]
    public string  FullName    { get; set; } = null!;

    [EmailAddress, StringLength(255)]
    public string? Email       { get; set; }

    [Phone, StringLength(20)]
    public string? PhoneNumber { get; set; }

    [Required]
    public string  Role        { get; set; } = null!;
}
