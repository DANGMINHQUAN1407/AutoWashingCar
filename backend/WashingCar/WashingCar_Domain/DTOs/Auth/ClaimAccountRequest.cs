using System.ComponentModel.DataAnnotations;
namespace WashingCar_Domain.DTOs.Auth;

public class ClaimAccountRequest
{
    [Required]
    public string PhoneNumber { get; set; } = null!;

    [Required, EmailAddress]
    public string Email { get; set; } = null!;

    [Required, MinLength(6)]
    public string Password { get; set; } = null!;
}