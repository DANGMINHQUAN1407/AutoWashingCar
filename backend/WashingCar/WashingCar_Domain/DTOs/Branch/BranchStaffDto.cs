namespace WashingCar_Domain.DTOs.Branch;

public class BranchStaffDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = null!;
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public bool IsActive { get; set; }
}
