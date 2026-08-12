using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Voucher;
using WashingCar_Domain.DTOs.Common;

namespace WashingCar_BLL.Services;

/// <summary>Gán voucher theo hạng thành viên (Admin CRUD) + đổi điểm lấy voucher (Customer). Đọc thẳng ILoyaltyRepository, không qua ILoyaltyService.</summary>
public class LoyaltyVoucherService(
    IVoucherRepository voucherRepo,
    ILoyaltyRepository loyaltyRepo,
    ITierRepository tierRepo,
    IUserRepository userRepo,
    ILogger<LoyaltyVoucherService> logger) : ILoyaltyVoucherService
{
    private readonly IVoucherRepository _voucherRepo = voucherRepo;
    private readonly ILoyaltyRepository _loyaltyRepo = loyaltyRepo;
    private readonly ITierRepository _tierRepo = tierRepo;
    private readonly IUserRepository _userRepo = userRepo;
    private readonly ILogger<LoyaltyVoucherService> _logger = logger;

    // TierVoucher CRUD (Admin)

    /// <summary>Gán 1 voucher cho 1 hạng thành viên kèm điểm yêu cầu.</summary>
    /// <remarks>
    /// Gọi: ITierRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync + ExistsTierVoucherPairAsync
    /// → AddTierVoucherAsync + SaveChangesAsync → GetTierVoucherByIdAsync (trả về).
    /// </remarks>
    public async Task<TierVoucherDto> CreateTierVoucherAsync(AssignTierVoucherRequest request, CancellationToken ct = default)
    {
        var tier = await _tierRepo.GetByIdAsync(request.TierId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Tier.NotFound);

        var voucher = await _voucherRepo.GetByIdAsync(request.VoucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);

        if (await _voucherRepo.ExistsTierVoucherPairAsync(request.TierId, request.VoucherId, null, ct))
            throw AppException.Conflict(ValidationMessage.Voucher.TierVoucherAlreadyAssigned);

        var tv = new TierVoucher
        {
            TierId = request.TierId,
            VoucherId = request.VoucherId,
            RequiredPoints = request.RequiredPoints,
            CreatedAtUtc = DateTime.UtcNow
        };

        await _voucherRepo.AddTierVoucherAsync(tv, ct);
        await _voucherRepo.SaveChangesAsync(ct);

        var created = await _voucherRepo.GetTierVoucherByIdAsync(tv.TierVoucherId, ct);
        return created!.ToDto();
    }

    /// <summary>Đổi số điểm yêu cầu của 1 gán voucher-hạng (bao nhiêu điểm để đổi voucher này ở hạng đó).</summary>
    /// <remarks>Gọi: IVoucherRepository.GetTierVoucherByIdAsync → SaveChangesAsync.</remarks>
    public async Task<TierVoucherDto> UpdateTierVoucherAsync(Guid id, int requiredPoints, CancellationToken ct = default)
    {
        if (requiredPoints < 1)
            throw AppException.BadRequest(ValidationMessage.Voucher.RequiredPointsMustBePositive);

        var tv = await _voucherRepo.GetTierVoucherByIdAsync(id, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.TierVoucherNotFound);

        tv.RequiredPoints = requiredPoints;
        await _voucherRepo.SaveChangesAsync(ct);

        return tv.ToDto();
    }

    /// <summary>Chi tiết 1 gán voucher-hạng theo Id. Ném 404 nếu không tồn tại.</summary>
    /// <remarks>Gọi: IVoucherRepository.GetTierVoucherByIdAsync.</remarks>
    public async Task<TierVoucherDto> GetTierVoucherByIdAsync(Guid id, CancellationToken ct = default)
    {
        var tv = await _voucherRepo.GetTierVoucherByIdAsync(id, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.TierVoucherNotFound);
        return tv.ToDto();
    }

    /// <summary>Danh sách các gán voucher-hạng, có phân trang. Dùng cho màn hình cấu hình đổi voucher bằng điểm.</summary>
    /// <remarks>Gọi: IVoucherRepository.GetTierVouchersPagedAsync.</remarks>
    public async Task<PagedResult<TierVoucherDto>> GetTierVouchersPagedAsync(PaginationQuery query, CancellationToken ct = default)
    {
        var (items, total) = await _voucherRepo.GetTierVouchersPagedAsync(query, ct);
        return new PagedResult<TierVoucherDto>
        {
            Items = items.Select(tv => tv.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }

    /// <summary>Gỡ 1 gán voucher-hạng — voucher không còn được đổi bằng điểm ở hạng đó nữa.</summary>
    /// <remarks>Gọi: IVoucherRepository.GetTierVoucherByIdAsync → RemoveTierVoucher → SaveChangesAsync.</remarks>
    public async Task DeleteTierVoucherAsync(Guid id, CancellationToken ct = default)
    {
        var tv = await _voucherRepo.GetTierVoucherByIdAsync(id, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.TierVoucherNotFound);
        _voucherRepo.RemoveTierVoucher(tv);
        await _voucherRepo.SaveChangesAsync(ct);
    }

    // Customer operations

    /// <summary>Danh sách voucher khả dụng để đổi theo hạng hiện tại — tự tạo loyalty account hạng thấp nhất nếu chưa có.</summary>
    /// <remarks>
    /// Gọi: ILoyaltyRepository.GetByUserIdAsync (+ tự tạo qua ITierRepository.GetAllActiveOrderedAsync + AddAccountAsync
    /// + SaveChangesAsync nếu chưa có) → IVoucherRepository.GetTierVouchersByTierIdAsync + GetTierSpecificVoucherIdsAsync
    /// + GetPagedAsync + HasUserRedeemedVoucherAsync (loop mỗi voucher).
    /// </remarks>
    public async Task<List<AvailableVoucherDto>> GetAvailableVouchersAsync(Guid userId, Guid? branchId = null, CancellationToken ct = default)
    {
        var loyaltyAccount = await _loyaltyRepo.GetByUserIdAsync(userId, ct);
        if (loyaltyAccount == null)
        {
            var tiers = await _tierRepo.GetAllActiveOrderedAsync(ct);
            if (tiers.Count == 0)
                throw AppException.BadRequest(ValidationMessage.Tier.NoTierConfigured);

            var baseTier = tiers[0];
            loyaltyAccount = new LoyaltyAccount
            {
                UserId = userId,
                TierId = baseTier.TierId,
                CurrentPoints = 0,
                LifetimePoints = 0,
            };
            await _loyaltyRepo.AddAccountAsync(loyaltyAccount, ct);
            await _loyaltyRepo.SaveChangesAsync(ct);

            loyaltyAccount = await _loyaltyRepo.GetByUserIdAsync(userId, ct);
        }

        if (loyaltyAccount == null)
            throw AppException.NotFound(ValidationMessage.Voucher.TierInfoLoadFailed);

        // 1. Lấy danh sách Voucher được cấu hình riêng cho Tier của Khách hàng
        var tierVouchers = await _voucherRepo.GetTierVouchersByTierIdAsync(loyaltyAccount.TierId, ct);
        var tierVoucherMap = tierVouchers.ToDictionary(tv => tv.VoucherId, tv => tv.RequiredPoints);

        // 2. Lấy danh sách ID của các Voucher đã được gán cho bất kỳ Tier nào khác
        var tierSpecificIds = await _voucherRepo.GetTierSpecificVoucherIdsAsync(ct);

        // 3. Lấy tất cả các Voucher hoạt động và đã phê duyệt khả dụng cho chi nhánh hiện tại (bao gồm cả Voucher hệ thống)
        var allVouchersFilter = new VoucherSearchFilter
        {
            ApprovalStatus = VoucherApprovalStatus.Approved,
            IsActive = true,
            BranchId = branchId,
            IncludeSystemVouchers = true,
            Page = 1,
            PageSize = 9999
        };
        var (allVouchers, _) = await _voucherRepo.GetPagedAsync(allVouchersFilter, ct);

        var availableList = new List<AvailableVoucherDto>();
        var now = DateTime.UtcNow;

        foreach (var v in allVouchers)
        {
            // Bỏ qua nếu voucher không nằm trong hạn sử dụng hoặc hết lượt phát hành
            if (v.StartUtc > now || v.EndUtc < now || v.UsedCount >= v.Quantity)
            {
                continue;
            }

            // Kiểm tra xem khách hàng đã nhận/đổi voucher này chưa
            var alreadyRedeemed = await _voucherRepo.HasUserRedeemedVoucherAsync(userId, v.VoucherId, ct);
            if (alreadyRedeemed)
            {
                continue;
            }

            // Phân loại:
            if (tierVoucherMap.TryGetValue(v.VoucherId, out var requiredPoints))
            {
                // Loại 1: Voucher riêng của hạng thành viên hiện tại -> Yêu cầu điểm tích lũy tương ứng
                availableList.Add(v.ToAvailableDto(requiredPoints));
            }
            else
            {
                // Nếu nó thuộc một Tier khác → Bỏ qua (không cho phép xem/đổi)
                if (tierSpecificIds.Contains(v.VoucherId))
                {
                    continue;
                }

                // Voucher Admin tạo (BranchId == null): đã tự động nhận vào "Voucher của tôi" → bỏ qua ở đây
                if (v.BranchId == null)
                {
                    continue;
                }

                // Voucher Staff tạo (BranchId != null, không gán hạng): hiển thị trong "Đổi quà tặng" với điểm yêu cầu từ voucher (nếu không cấu hình thì 0 điểm = nhận miễn phí)
                availableList.Add(v.ToAvailableDto(v.RequiredPoints));
            }
        }

        return availableList;
    }

    /// <summary>Customer đổi điểm lấy voucher — trừ CurrentPoints (không đụng LifetimePoints), tăng UsedCount của voucher.</summary>
    /// <remarks>
    /// Gọi: ILoyaltyRepository.GetByUserIdAsync (tự tạo nếu chưa có) → IVoucherRepository.GetByIdAsync
    /// + HasUserRedeemedVoucherAsync + GetTierVouchersByTierIdAsync + GetTierSpecificVoucherIdsAsync (nếu cần)
    /// → ILoyaltyRepository.AddLedgerEntryAsync (nếu tốn điểm) → IVoucherRepository.AddUserVoucherAsync
    /// + SaveChangesAsync + ILoyaltyRepository.SaveChangesAsync → GetUserVoucherByIdAsync (trả về).
    /// </remarks>
    public async Task<UserVoucherDto> RedeemVoucherAsync(Guid userId, Guid voucherId, CancellationToken ct = default)
    {
        var loyaltyAccount = await _loyaltyRepo.GetByUserIdAsync(userId, ct);
        if (loyaltyAccount == null)
        {
            var tiers = await _tierRepo.GetAllActiveOrderedAsync(ct);
            if (tiers.Count == 0)
                throw AppException.BadRequest(ValidationMessage.Tier.NoTierConfigured);

            var baseTier = tiers[0];
            loyaltyAccount = new LoyaltyAccount
            {
                UserId = userId,
                TierId = baseTier.TierId,
                CurrentPoints = 0,
                LifetimePoints = 0,
            };
            await _loyaltyRepo.AddAccountAsync(loyaltyAccount, ct);
            await _loyaltyRepo.SaveChangesAsync(ct);

            loyaltyAccount = await _loyaltyRepo.GetByUserIdAsync(userId, ct);
        }

        if (loyaltyAccount == null)
            throw AppException.NotFound(ValidationMessage.Voucher.TierInfoLoadFailed);

        var v = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);

        var now = DateTime.UtcNow;

        if (!v.IsActive || v.ApprovalStatus != VoucherApprovalStatus.Approved)
            throw AppException.BadRequest(ValidationMessage.Voucher.Inactive);

        if (v.StartUtc > now)
            throw AppException.BadRequest(ValidationMessage.Voucher.NotStarted);

        if (v.EndUtc < now)
            throw AppException.BadRequest(ValidationMessage.Voucher.Expired);

        if (v.UsedCount >= v.Quantity)
            throw AppException.BadRequest(ValidationMessage.Voucher.OutOfStock);

        if (await _voucherRepo.HasUserRedeemedVoucherAsync(userId, voucherId, ct))
            throw AppException.Conflict(ValidationMessage.Voucher.AlreadyRedeemedOnce);

        // 1. Kiểm tra điểm yêu cầu
        var tierVouchers = await _voucherRepo.GetTierVouchersByTierIdAsync(loyaltyAccount.TierId, ct);
        var tv = tierVouchers.FirstOrDefault(x => x.VoucherId == voucherId);
        int requiredPoints = 0;

        if (tv == null)
        {
            // Nếu không gán cho hạng thành viên hiện tại:
            // Phải kiểm tra xem nó có bị gán cho hạng khác hay không
            var tierSpecificIds = await _voucherRepo.GetTierSpecificVoucherIdsAsync(ct);
            if (tierSpecificIds.Contains(voucherId))
            {
                throw AppException.BadRequest(ValidationMessage.Voucher.NotConfiguredForCurrentTier);
            }

            // Nếu không gán cho bất kỳ hạng nào, nó là Voucher hệ thống -> requiredPoints = v.RequiredPoints
            requiredPoints = v.RequiredPoints;
        }
        else
        {
            requiredPoints = tv.RequiredPoints;
        }

        // 2. Thực hiện trừ điểm nếu là voucher tính điểm
        if (requiredPoints > 0)
        {
            if (loyaltyAccount.CurrentPoints < requiredPoints)
                throw AppException.BadRequest(ValidationMessage.Voucher.InsufficientPointsToRedeem(requiredPoints, loyaltyAccount.CurrentPoints));

            loyaltyAccount.CurrentPoints -= requiredPoints;
            var ledgerEntry = new LoyaltyLedgerEntry
            {
                LoyaltyAccountId = loyaltyAccount.LoyaltyAccountId,
                UserId = userId,
                EntryType = LoyaltyEntryType.Redeem,
                Points = -requiredPoints,
                BalanceAfter = loyaltyAccount.CurrentPoints,
                Description = $"Đổi voucher {v.VoucherCode} (-{requiredPoints} điểm)"
            };
            await _loyaltyRepo.AddLedgerEntryAsync(ledgerEntry, ct);
        }

        v.UsedCount++;

        var userVoucher = new UserVoucher
        {
            UserId = userId,
            VoucherId = voucherId,
            RedeemedPoints = requiredPoints,
            VoucherStatus = 1,
            RedeemedAtUtc = now,
            ExpiredAtUtc = v.EndUtc
        };
        await _voucherRepo.AddUserVoucherAsync(userVoucher, ct);

        await _voucherRepo.SaveChangesAsync(ct);
        await _loyaltyRepo.SaveChangesAsync(ct);

        var createdUv = await _voucherRepo.GetUserVoucherByIdAsync(userVoucher.UserVoucherId, ct);
        return createdUv!.ToDto();
    }

    /// <summary>Voucher của tôi — tự động claim thêm voucher hệ thống (Admin tạo) chưa từng nhận, rồi trả danh sách phân trang.</summary>
    /// <remarks>
    /// Gọi: IVoucherRepository.GetActiveSystemVouchersAsync → HasUserRedeemedVoucherAsync (loop) → AddUserVoucherAsync
    /// (auto-claim) → SaveChangesAsync → GetUserVouchersPagedAsync.
    /// </remarks>
    public async Task<PagedResult<UserVoucherDto>> GetMyVouchersPagedAsync(Guid userId, UserVoucherQuery query, CancellationToken ct = default)
    {
        // 1. Tự động liên kết các voucher hệ thống (Admin tạo, không giới hạn chi nhánh và hạng thành viên) cho người dùng
        var now = DateTime.UtcNow;
        var activeSystemVouchers = await _voucherRepo.GetActiveSystemVouchersAsync(now, ct);

        foreach (var v in activeSystemVouchers)
        {
            var exists = await _voucherRepo.HasUserRedeemedVoucherAsync(userId, v.VoucherId, ct);
            if (!exists)
            {
                var uv = new UserVoucher
                {
                    UserVoucherId = Guid.NewGuid(),
                    UserId = userId,
                    VoucherId = v.VoucherId,
                    VoucherStatus = 1, // Chưa sử dụng (Active / Unused)
                    RedeemedPoints = 0,
                    RedeemedAtUtc = now,
                    ExpiredAtUtc = v.EndUtc
                };
                await _voucherRepo.AddUserVoucherAsync(uv, ct);
                v.UsedCount++;
            }
        }
        await _voucherRepo.SaveChangesAsync(ct);

        // 2. Lấy danh sách phân trang bình thường
        var (items, total) = await _voucherRepo.GetUserVouchersPagedAsync(userId, query, ct);
        return new PagedResult<UserVoucherDto>
        {
            Items = items.Select(uv => uv.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }
}
