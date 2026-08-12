using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Loyalty;

namespace WashingCar_BLL.Interfaces;

public interface ILoyaltyService
{
    /// <summary>Danh sách benefit đang active của hạng hiện tại (dùng bởi BookingService để áp discount/advance-days theo tier).</summary>
    Task<IReadOnlyList<TierBenefit>> GetActiveTierBenefitsAsync(Guid userId, CancellationToken ct = default);

    Task<LoyaltyAccountDto> GetMyLoyaltyAsync(Guid userId, CancellationToken ct = default);
    Task<LoyaltyAccountDto> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<PagedResult<LoyaltyLedgerDto>> GetLedgerAsync(Guid userId, LoyaltyLedgerQuery query, CancellationToken ct = default);
    Task<LoyaltyAccountDto> EarnPointsAsync(Guid userId, int amount, Guid? bookingId, string? description, CancellationToken ct = default);

    /// <summary>Tính điểm từ số tiền đơn (theo EarnRate hạng hiện tại) + cộng điểm, cộng thêm 30% nếu applyFullPaymentBonus (thanh toán 100% 1 lần). Trả về số điểm đã cộng (0 nếu không cộng / đã cộng rồi).</summary>
    Task<int> EarnFromBookingAsync(Guid userId, decimal bookingAmount, Guid bookingId, bool applyFullPaymentBonus = false, CancellationToken ct = default);

    Task<LoyaltyAccountDto> AdjustPointsAsync(Guid managerId, AdjustPointsRequest request, CancellationToken ct = default);

    Task<int> GetCurrentPointsAsync(Guid userId, CancellationToken ct = default);
    Task<int> RedeemForBookingAsync(Guid userId, int points, Guid bookingId, CancellationToken ct = default);
    Task<int> EarnFromCancelledBookingAsync(Guid userId, decimal paidAmount, string bookingCode, Guid bookingId, CancellationToken ct = default);
}
