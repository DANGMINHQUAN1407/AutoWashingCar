using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Voucher;
using WashingCar_Domain.DTOs.Common;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace WashingCar_BLL.Interfaces;

public interface ILoyaltyVoucherService
{
    // TierVoucher CRUD (Admin)
    Task<TierVoucherDto> CreateTierVoucherAsync(AssignTierVoucherRequest request, CancellationToken ct = default);
    Task<TierVoucherDto> UpdateTierVoucherAsync(Guid id, int requiredPoints, CancellationToken ct = default);
    Task<TierVoucherDto> GetTierVoucherByIdAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<TierVoucherDto>> GetTierVouchersPagedAsync(PaginationQuery query, CancellationToken ct = default);
    Task DeleteTierVoucherAsync(Guid id, CancellationToken ct = default);

    // Customer operations
    Task<List<AvailableVoucherDto>> GetAvailableVouchersAsync(Guid userId, Guid? branchId = null, CancellationToken ct = default);
    Task<UserVoucherDto> RedeemVoucherAsync(Guid userId, Guid voucherId, CancellationToken ct = default);
    Task<PagedResult<UserVoucherDto>> GetMyVouchersPagedAsync(Guid userId, UserVoucherQuery query, CancellationToken ct = default);
}
