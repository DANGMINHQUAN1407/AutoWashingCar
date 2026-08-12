using WashingCar_Common.Enum;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.TierBenefit;

namespace WashingCar_BLL.Mappers;

public static class TierBenefitMapper
{
    public static TierBenefitDto ToDto(this TierBenefit b) => new()
    {
        TierBenefitId = b.TierBenefitId,
        TierId = b.TierId,
        BenefitType = b.BenefitType,
        BenefitTypeName = b.BenefitType switch
        {
            BenefitType.DiscountPercent    => "Giảm giá %",
            BenefitType.AdvanceBookingDays => "Đặt trước (ngày)",
            BenefitType.FreeService        => "Dịch vụ miễn phí",
            BenefitType.PrioritySupport    => "Hỗ trợ ưu tiên",
            BenefitType.BonusPointPercent  => "Thưởng điểm thêm %",
            _ => "Khác",
        },
        BenefitValue = b.BenefitValue,
        Description = b.Description,
        IsActive = b.IsActive,
        CreatedAtUtc = b.CreatedAtUtc,
    };
}
