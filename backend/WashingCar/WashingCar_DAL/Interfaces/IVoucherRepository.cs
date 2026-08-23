using Microsoft.EntityFrameworkCore.Storage;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_DAL.Interfaces;

public interface IVoucherRepository
{
    Task<Voucher?> GetByIdAsync(Guid voucherId, CancellationToken ct = default);
    Task<Voucher?> GetByCodeAsync(string code, CancellationToken ct = default);
    Task<bool> ExistsCodeAsync(string code, Guid? excludeId = null, CancellationToken ct = default);
    Task<(List<Voucher> Items, int TotalCount)> GetPagedAsync(VoucherSearchFilter filter, CancellationToken ct = default);
    Task AddAsync(Voucher voucher, CancellationToken ct = default);
    void Delete(Voucher voucher);
    Task SaveChangesAsync(CancellationToken ct = default);

    // TierVoucher CRUD
    Task<TierVoucher?> GetTierVoucherByIdAsync(Guid tierVoucherId, CancellationToken ct = default);
    Task<bool> ExistsTierVoucherPairAsync(Guid tierId, Guid voucherId, Guid? excludeId = null, CancellationToken ct = default);
    Task<(List<TierVoucher> Items, int TotalCount)> GetTierVouchersPagedAsync(WashingCar_Domain.DTOs.Common.PaginationQuery query, CancellationToken ct = default);
    Task AddTierVoucherAsync(TierVoucher tierVoucher, CancellationToken ct = default);
    void RemoveTierVoucher(TierVoucher tierVoucher);

    // Customer operations
    Task<List<Guid>> GetTierSpecificVoucherIdsAsync(CancellationToken ct = default);
    Task<List<TierVoucher>> GetTierVouchersByTierIdAsync(Guid tierId, CancellationToken ct = default);
    Task<bool> HasUserRedeemedVoucherAsync(Guid userId, Guid voucherId, CancellationToken ct = default);
    Task<UserVoucher?> GetUserVoucherByIdAsync(Guid userVoucherId, CancellationToken ct = default);
    Task<UserVoucher?> GetUserVoucherAsync(Guid userId, Guid voucherId, CancellationToken ct = default);
    Task<(List<UserVoucher> Items, int TotalCount)> GetUserVouchersPagedAsync(Guid userId, UserVoucherQuery query, CancellationToken ct = default);
    Task AddUserVoucherAsync(UserVoucher userVoucher, CancellationToken ct = default);
    Task<List<Voucher>> GetActiveSystemVouchersAsync(DateTime now, CancellationToken ct = default);

    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);
    Task AcquireVoucherStockLockAsync(Guid voucherId, CancellationToken ct = default);
    Task AcquireUserVoucherLockAsync(Guid userId, Guid voucherId, CancellationToken ct = default);
}
