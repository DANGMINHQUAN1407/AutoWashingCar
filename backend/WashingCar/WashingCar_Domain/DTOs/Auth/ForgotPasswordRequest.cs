using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Auth;

public class ForgotPasswordRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = null!;
}
