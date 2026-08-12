using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Branch;

public class BranchQuery : PaginationQuery
{
    public string? City { get; set; }
    public bool? IsActive { get; set; }
}
