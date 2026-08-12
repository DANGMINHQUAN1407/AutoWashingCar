using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Auth;

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email    { get; set; } = null!;

    [Required]
    public string Password { get; set; } = null!;
}
