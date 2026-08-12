using WashingCar_Common.Enum;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Loyalty;

namespace WashingCar_BLL.Mappers;

public static class LoyaltyMapper
{
    public static LoyaltyLedgerDto ToDto(this LoyaltyLedgerEntry e) => new()
    {
        LoyaltyLedgerEntryId = e.LoyaltyLedgerEntryId,
        EntryType = e.EntryType,
        EntryTypeName = e.EntryType switch
        {
            LoyaltyEntryType.Earn   => "Tích điểm",
            LoyaltyEntryType.Redeem => "Đổi điểm",
            LoyaltyEntryType.Expire => "Hết hạn",
            LoyaltyEntryType.Adjust => "Điều chỉnh",
            _ => "Khác",
        },
        Points = e.Points,
        BalanceAfter = e.BalanceAfter,
        Description = e.Description,
        BookingId = e.BookingId,
        CreatedAtUtc = e.CreatedAtUtc,
    };

    public static TierInfoDto ToTierInfo(this Tier t) => new()
    {
        TierId = t.TierId,
        TierName = t.TierName,
        MinPoints = t.MinPoints,
        EarnRate = t.EarnRate,
        Benefits = t.Benefits,
    };
}
