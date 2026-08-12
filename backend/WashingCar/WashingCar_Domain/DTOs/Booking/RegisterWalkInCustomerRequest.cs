using System.ComponentModel.DataAnnotations;

namespace WashingCar_Domain.DTOs.Booking;

/// <summary>Staff đăng ký khách vãng lai (guest). SĐT &amp; email đều optional.</summary>
public class RegisterWalkInCustomerRequest
{
    [Required]
    [StringLength(200)]
    public string FullName { get; set; } = null!;

    [Phone]
    [StringLength(20)]
    public string? PhoneNumber { get; set; }

    [EmailAddress]
    [StringLength(255)]
    public string? Email { get; set; }
}
