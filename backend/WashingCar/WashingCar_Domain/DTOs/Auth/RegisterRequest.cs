using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Auth
{
    public class RegisterRequest
    {
        [Required, StringLength(200)]
        public string FullName { get; set; } = null!;

        [Required, EmailAddress, StringLength(255)]
        public string Email { get; set; } = null!;

        [Phone, StringLength(20)]
        public string? PhoneNumber { get; set; }

        [Required, MinLength(6)]
        public string Password { get; set; } = null!;
    }
}
