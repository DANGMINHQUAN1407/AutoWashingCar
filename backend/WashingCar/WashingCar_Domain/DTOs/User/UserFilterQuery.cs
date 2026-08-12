using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.User;

public class UserFilterQuery : PaginationQuery
{
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public string? Search { get; set; }
    public string? PhoneNumber { get; set; }
}
