using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Auth;

public class ChangePasswordRequest
{
    [Required]
    public string OldPassword { get; set; } = null!;

    [Required, MinLength(6)]
    public string NewPassword { get; set; } = null!;
}
