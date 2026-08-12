using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Auth;

public class ResetPasswordRequest
{
    [Required]
    public string Token       { get; set; } = null!;

    [Required, MinLength(6)]
    public string NewPassword { get; set; } = null!;
}
