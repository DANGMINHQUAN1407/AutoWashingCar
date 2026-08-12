using WashingCar_Domain.DTOs.Tier;

namespace WashingCar_BLL.Mappers;

public static class TierMapper
{
    public static TierDto ToDto(this WashingCar_DAL.Entities.Tier t) => new()
    {
        TierId = t.TierId,
        TierName = t.TierName,
        MinPoints = t.MinPoints,
        EarnRate = t.EarnRate,
        Benefits = t.Benefits,
        IsActive = t.IsActive,
        CreatedAtUtc = t.CreatedAtUtc,
    };
}
