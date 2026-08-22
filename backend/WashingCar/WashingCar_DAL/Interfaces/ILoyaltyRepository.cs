using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Loyalty;

namespace WashingCar_DAL.Interfaces;

public interface ILoyaltyRepository
{
    Task<LoyaltyAccount?> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task AddAccountAsync(LoyaltyAccount account, CancellationToken ct = default);
    Task<(List<LoyaltyLedgerEntry> Items, int TotalCount)> GetLedgerAsync(Guid loyaltyAccountId, LoyaltyLedgerQuery query, CancellationToken ct = default);
    Task AddLedgerEntryAsync(LoyaltyLedgerEntry entry, CancellationToken ct = default);
    Task<bool> HasEarnedForBookingAsync(Guid bookingId, CancellationToken ct = default);
    Task<int> GetRedeemedPointsForBookingAsync(Guid bookingId, CancellationToken ct = default);
    Task<bool> HasBookingAtBranchAsync(Guid userId, Guid branchId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
