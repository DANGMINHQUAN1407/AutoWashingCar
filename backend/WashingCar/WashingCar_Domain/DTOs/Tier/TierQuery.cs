using WashingCar_Domain.DTOs.Common;

namespace WashingCar_Domain.DTOs.Tier;

public class TierQuery : PaginationQuery
{
    public bool? IsActive { get; set; }
}
