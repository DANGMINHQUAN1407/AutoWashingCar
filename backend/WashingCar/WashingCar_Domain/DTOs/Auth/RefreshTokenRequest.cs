using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Auth;

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = null!;
}
