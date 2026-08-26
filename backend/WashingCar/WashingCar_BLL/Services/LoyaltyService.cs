using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Loyalty;
using WashingCar_Domain.DTOs.Tier;

namespace WashingCar_BLL.Services;

public class LoyaltyService : ILoyaltyService
{
    // 1 điểm cho mỗi 1.000đ (nhân hệ số EarnRate của hạng). Đổi thang điểm tại đây.
    private const decimal PointsPerCurrencyUnit = 1000m;

    private readonly ILoyaltyRepository _repo;
    private readonly ITierRepository _tierRepo;
    private readonly ITierBenefitRepository _tierBenefitRepo;
    private readonly IBranchRepository _branchRepo;
    private readonly IUserRepository _userRepo;
    private readonly IEmailService _emailService;
    private readonly ILogger<LoyaltyService> _logger;

    public LoyaltyService(ILoyaltyRepository repo, ITierRepository tierRepo, ITierBenefitRepository tierBenefitRepo,
        IBranchRepository branchRepo, IUserRepository userRepo, IEmailService emailService, ILogger<LoyaltyService> logger)
    {
        _repo = repo;
        _tierRepo = tierRepo;
        _tierBenefitRepo = tierBenefitRepo;
        _branchRepo = branchRepo;
        _userRepo = userRepo;
        _emailService = emailService;
        _logger = logger;
    }

    // Benefit đang active của hạng hiện tại của user — tự tạo account hạng thấp nhất nếu chưa có (giống GetMyLoyaltyAsync)
    /// <summary>Được BookingService gọi để đọc tier benefit (DiscountPercent, AdvanceBookingDays) áp dụng lúc quote/create.</summary>
    /// <remarks>Gọi: helper GetOrCreateAccountAsync → ITierBenefitRepository.GetByTierIdAsync.</remarks>
    public async Task<IReadOnlyList<TierBenefit>> GetActiveTierBenefitsAsync(Guid userId, CancellationToken ct = default)
    {
        var account  = await GetOrCreateAccountAsync(userId, ct);
        var benefits = await _tierBenefitRepo.GetByTierIdAsync(account.TierId, ct);
        return benefits.Where(b => b.IsActive).ToList();
    }
    // Admin/Manager xem loyalty của 1 user bất kỳ
    // Khác GetMyLoyalty: KHÔNG tự tạo account → NotFound nếu chưa có
    /// <summary>Admin/Manager xem loyalty của 1 user bất kỳ — không tự tạo account (NotFound nếu chưa có).</summary>
    /// <remarks>Gọi: ILoyaltyRepository.GetByUserIdAsync → helper BuildLoyaltyAccountDto (→ ITierRepository.GetAllActiveOrderedAsync).</remarks>
    public async Task<LoyaltyAccountDto> GetByUserIdAsync(Guid userId, CancellationToken ct = default)
    {
        var account = await _repo.GetByUserIdAsync(userId, ct);
        if (account == null)
        {
            throw AppException.NotFound(ValidationMessage.Loyalty.AccountNotFound);
        }
        await RecomputeTierAsync(account, ct);
        return await BuildLoyaltyAccountDto(account, ct);
    }

    // Lịch sử cộng/trừ điểm (giống lịch sử Shopee Xu)
    // Lọc theo EntryType nếu có, ORDER BY mới nhất trước, phân trang
    /// <summary>Lịch sử cộng/trừ điểm — lọc theo EntryType nếu có, phân trang.</summary>
    /// <remarks>Gọi: ILoyaltyRepository.GetByUserIdAsync → GetLedgerAsync.</remarks>
    public async Task<PagedResult<LoyaltyLedgerDto>> GetLedgerAsync(Guid userId, LoyaltyLedgerQuery query, CancellationToken ct = default)
    {
        var account = await _repo.GetByUserIdAsync(userId, ct);
        if (account == null)
        {
            throw AppException.NotFound(ValidationMessage.Loyalty.AccountNotFound);
        }
        var (items, totalCount) = await _repo.GetLedgerAsync(account.LoyaltyAccountId, query, ct);

        return new PagedResult<LoyaltyLedgerDto>
        {
            Items = items.Select(e => e.ToDto()).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }

    // Helper dùng chung: build DTO kèm thông tin NextTier + PointsToNextTier
    // Lấy tất cả tier active → tìm tier có MinPoints > tier hiện tại → đó là NextTier
    /// <summary>Dựng DTO loyalty kèm hạng kế tiếp (NextTier) và số điểm còn thiếu để lên hạng (PointsToNextTier).</summary>
    /// <remarks>Gọi: ITierRepository.GetAllActiveOrderedAsync.</remarks>
    private async Task<LoyaltyAccountDto> BuildLoyaltyAccountDto(LoyaltyAccount account, CancellationToken ct)
    {
        var allTiers = await _tierRepo.GetAllActiveOrderedAsync(ct);
        var nextTier = allTiers.FirstOrDefault(t => t.MinPoints > account.Tier.MinPoints);

        return new LoyaltyAccountDto
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = account.UserId,
            CurrentPoints = account.CurrentPoints,
            LifetimePoints = account.LifetimePoints,
            Tier = account.Tier.ToTierInfo(),
            NextTier = nextTier?.ToTierInfo(),
            PointsToNextTier = nextTier != null
                ? Math.Max(0, nextTier.MinPoints - account.LifetimePoints)
                : null,
            UpdatedAtUtc = account.UpdatedAtUtc,
        };
    }

    /// <summary>
    /// Tính toán và tự động cập nhật TierId của tài khoản dựa trên LifetimePoints và cấu hình MinPoints của các hạng.
    /// </summary>
    private async Task<bool> RecomputeTierAsync(LoyaltyAccount account, CancellationToken ct = default)
    {
        var allTiers = await _tierRepo.GetAllActiveOrderedAsync(ct);
        if (allTiers.Count == 0) return false;

        var eligibleTier = allTiers
            .Where(t => t.IsActive && account.LifetimePoints >= t.MinPoints)
            .OrderByDescending(t => t.MinPoints)
            .FirstOrDefault() ?? allTiers[0];

        if (account.TierId != eligibleTier.TierId)
        {
            var oldTierName = account.Tier?.TierName ?? "Unknown";
            account.TierId = eligibleTier.TierId;
            account.Tier = eligibleTier;
            account.UpdatedAtUtc = DateTime.UtcNow;
            await _repo.SaveChangesAsync(ct);
            _logger.LogInformation("User {UserId} upgraded/updated from tier {OldTier} to {NewTier} with {LifetimePoints} lifetime points",
                account.UserId, oldTierName, eligibleTier.TierName, account.LifetimePoints);
            return true;
        }

        return false;
    }

    // Customer xem loyalty của mình. Nếu chưa có account → tự tạo với tier thấp nhất (Member)
    // Tính NextTier + PointsToNextTier (VD: đang Silver, cần thêm 3800đ lên Gold)
    /// <summary>Customer xem loyalty của mình — tự tạo account hạng thấp nhất nếu chưa có.</summary>
    /// <remarks>Gọi: helper GetOrCreateAccountAsync → helper BuildLoyaltyAccountDto.</remarks>
    public async Task<LoyaltyAccountDto> GetMyLoyaltyAsync(Guid userId, CancellationToken ct = default)
    {
        var account = await GetOrCreateAccountAsync(userId, ct);
        return await BuildLoyaltyAccountDto(account, ct);
    }

    // Lấy account loyalty của user; chưa có thì tạo mới ở hạng thấp nhất (MinPoints nhỏ nhất).
    // Account trả về luôn kèm Tier (để đọc EarnRate / MinPoints).
    /// <summary>Lấy tài khoản loyalty của khách; nếu chưa có thì tạo mới ở hạng thấp nhất (0 điểm). Trả về kèm Tier để đọc EarnRate/MinPoints.</summary>
    /// <remarks>Gọi: ILoyaltyRepository.GetByUserIdAsync → ITierRepository.GetAllActiveOrderedAsync → AddAccountAsync (nếu chưa có).</remarks>
    private async Task<LoyaltyAccount> GetOrCreateAccountAsync(Guid userId, CancellationToken ct)
    {
        var account = await _repo.GetByUserIdAsync(userId, ct);
        if (account != null)
        {
            await RecomputeTierAsync(account, ct);
            return account;
        }

        var tiers = await _tierRepo.GetAllActiveOrderedAsync(ct);
        if (tiers.Count == 0)
        {
            throw AppException.BadRequest(ValidationMessage.Tier.NoTierConfigured);
        }

        var baseTier = tiers[0]; // MinPoints thấp nhất (đã orderBy MinPoints)

        account = new LoyaltyAccount
        {
            UserId = userId,
            TierId = baseTier.TierId,
            CurrentPoints = 0,
            LifetimePoints = 0,
        };

        await _repo.AddAccountAsync(account, ct);
        account.Tier = baseTier; // Gán Tier để build DTO
        return account;
    }

    // Cộng điểm khi booking hoàn thành (BookingService sẽ gọi method này)
    // CurrentPoints += amount (điểm dùng được), LifetimePoints += amount (điểm xếp hạng)
    // Tạo LedgerEntry(Earn) → SaveChanges → Recompute tier → reload account
    /// <summary>Cộng điểm thủ công theo amount cố định — không phải luồng chính (xem EarnFromBookingAsync cho luồng booking thật).</summary>
    /// <remarks>Gọi: helper GetOrCreateAccountAsync → ILoyaltyRepository.AddLedgerEntryAsync → SaveChangesAsync → GetByUserIdAsync (reload sau trigger).</remarks>
    public async Task<LoyaltyAccountDto> EarnPointsAsync(Guid userId, int amount, Guid? bookingId, string? description, CancellationToken ct = default)
    {
        if (amount <= 0)
        {
            throw AppException.BadRequest(ValidationMessage.Loyalty.PointsMustBePositive);
        }

        var account = await GetOrCreateAccountAsync(userId, ct);

        account.CurrentPoints += amount;
        account.LifetimePoints += amount;

        var entry = new LoyaltyLedgerEntry
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = userId,
            BookingId = bookingId,
            EntryType = LoyaltyEntryType.Earn,
            Points = amount,
            BalanceAfter = account.CurrentPoints,
            Description = description ?? "Tích điểm từ đơn hàng",
        };

        await _repo.AddLedgerEntryAsync(entry, ct);
        await RecomputeTierAsync(account, ct);
        await _repo.SaveChangesAsync(ct);

        //Reload để lấy tier mới sau khi tính lại hạng
        account = await _repo.GetByUserIdAsync(userId, ct);
        return await BuildLoyaltyAccountDto(account!, ct);
    }

    // Bonus cho khách thanh toán 100% giá trị đơn trong 1 lần (không qua cọc) — +30% số điểm tính được từ đơn.
    private const decimal FullPaymentBonusRate = 0.30m;

    // Tính điểm từ số tiền đơn theo EarnRate hạng hiện tại + cộng điểm (gọi khi đóng booking).
    // points = floor(bookingAmount / PointsPerCurrencyUnit * EarnRate), cộng thêm 30% nếu applyFullPaymentBonus. Idempotent theo bookingId.
    /// <summary>Được BookingService.CloseAsync gọi — tính điểm theo EarnRate hạng, +30% nếu thanh toán 100% 1 lần. Idempotent theo bookingId.</summary>
    /// <remarks>
    /// Gọi: ILoyaltyRepository.HasEarnedForBookingAsync (idempotent check) → helper GetOrCreateAccountAsync
    /// → AddLedgerEntryAsync (tự SaveChanges, nâng hạng) → IUserRepository.GetByIdAsync + ILoyaltyRepository.GetByUserIdAsync
    /// + IEmailService.SendPointsEarnedEmailAsync (best-effort, qua helper TrySendPointsEarnedEmailAsync).
    /// </remarks>
    public async Task<int> EarnFromBookingAsync(Guid userId, decimal bookingAmount, Guid bookingId, bool applyFullPaymentBonus = false, CancellationToken ct = default)
    {
        // CloseAsync đã mở transaction; lock user phải được lấy trước khi kiểm tra idempotency.
        await _repo.AcquireUserLockAsync(userId, ct);

        // Đã cộng điểm cho đơn này rồi → không cộng lần 2
        if (await _repo.HasEarnedForBookingAsync(bookingId, ct))
        {
            return 0;
        }

        var account = await GetOrCreateAccountAsync(userId, ct);

        var basePoints  = (int)Math.Floor(bookingAmount / PointsPerCurrencyUnit * account.Tier.EarnRate);
        var bonusPoints = applyFullPaymentBonus ? (int)Math.Floor(basePoints * FullPaymentBonusRate) : 0;
        var points      = basePoints + bonusPoints;
        if (points <= 0)
        {
            return 0;
        }

        account.CurrentPoints += points;
        account.LifetimePoints += points;

        var entry = new LoyaltyLedgerEntry
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = userId,
            BookingId = bookingId,
            EntryType = LoyaltyEntryType.Earn,
            Points = points,
            BalanceAfter = account.CurrentPoints,
            Description = applyFullPaymentBonus
                ? $"Tích điểm từ đơn hàng (gồm bonus {FullPaymentBonusRate:P0} thanh toán 100%)"
                : "Tích điểm từ đơn hàng",
        };

        // AddLedgerEntryAsync tự SaveChanges
        await _repo.AddLedgerEntryAsync(entry, ct);
        await RecomputeTierAsync(account, ct);

        // Gửi mail báo cộng điểm (best-effort)
        await TrySendPointsEarnedEmailAsync(userId, points, ct);
        return points;
    }

    /// <summary>Được BookingService.CancelAsync gọi khi huỷ đơn đã cọc — cộng điểm từ số tiền cọc đã thu, idempotent theo bookingId.</summary>
    /// <remarks>
    /// Gọi: ILoyaltyRepository.HasEarnedForBookingAsync → helper GetOrCreateAccountAsync → AddLedgerEntryAsync
    /// → TrySendPointsEarnedEmailAsync (best-effort).
    /// </remarks>
    public async Task<int> EarnFromCancelledBookingAsync(Guid userId, decimal paidAmount, string bookingCode, Guid bookingId, CancellationToken ct = default)
    {
        await using var transaction = await _repo.BeginTransactionAsync(ct);
        await _repo.AcquireUserLockAsync(userId, ct);

        if (await _repo.HasEarnedForBookingAsync(bookingId, ct))
        {
            return 0;
        }

        var account = await GetOrCreateAccountAsync(userId, ct);
        var points = (int)Math.Floor(paidAmount / PointsPerCurrencyUnit * account.Tier.EarnRate);
        if (points <= 0)
        {
            return 0;
        }

        account.CurrentPoints += points;
        account.LifetimePoints += points;

        var entry = new LoyaltyLedgerEntry
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = userId,
            BookingId = bookingId,
            EntryType = LoyaltyEntryType.Earn,
            Points = points,
            BalanceAfter = account.CurrentPoints,
            Description = $"Tích điểm từ cọc của booking huỷ {bookingCode}",
        };

        await _repo.AddLedgerEntryAsync(entry, ct);
        await RecomputeTierAsync(account, ct);
        await transaction.CommitAsync(ct);

        // Gửi mail báo cộng điểm (best-effort), chỉ sau khi ledger đã commit.
        await TrySendPointsEarnedEmailAsync(userId, points, ct);

        return points;
    }

    /// <summary>Gửi email báo khách vừa được cộng điểm (best-effort — lỗi gửi mail không ảnh hưởng nghiệp vụ tích điểm).</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → ILoyaltyRepository.GetByUserIdAsync → IEmailService.SendPointsEarnedEmailAsync.</remarks>
    private async Task TrySendPointsEarnedEmailAsync(Guid userId, int pointsEarned, CancellationToken ct)
    {
        try
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user?.Email is null) return;

            // Reload để lấy số dư + hạng mới (sau khi trigger chạy)
            var account = await _repo.GetByUserIdAsync(userId, ct);
            if (account is null) return;

            await _emailService.SendPointsEarnedEmailAsync(
                user.Email, user.FullName, pointsEarned, account.CurrentPoints, account.Tier.TierName);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Gửi email cộng điểm cho user {UserId} thất bại", userId);
        }
    }

    // Manager tại chính chi nhánh đó điều chỉnh điểm thủ công (cộng thưởng hoặc trừ phạt)
    // Check: Manager phải có branch + customer phải có booking tại branch đó
    // Points > 0 → cộng cả CurrentPoints + LifetimePoints
    // Points < 0 → chỉ trừ CurrentPoints (LifetimePoints không giảm → không tụt hạng, giống Shopee)
    /// <summary>Manager tại chính chi nhánh điều chỉnh điểm thủ công — customer phải có booking tại chi nhánh đó.</summary>
    /// <remarks>
    /// Gọi: IBranchRepository.GetByManagerIdAsync → ILoyaltyRepository.HasBookingAtBranchAsync + GetByUserIdAsync
    /// → AddLedgerEntryAsync + SaveChangesAsync → GetByUserIdAsync (reload) → helper BuildLoyaltyAccountDto.
    /// </remarks>
    public async Task<LoyaltyAccountDto> AdjustPointsAsync(Guid managerId, AdjustPointsRequest request, CancellationToken ct = default)
    {
        if (request.Points == 0)
        {
            throw AppException.BadRequest(ValidationMessage.Loyalty.AdjustPointsCannotBeZero);
        }

        await using var transaction = await _repo.BeginTransactionAsync(ct);
        await _repo.AcquireUserLockAsync(request.UserId, ct);

        // Check manager có branch không
        var branch = await _branchRepo.GetByManagerIdAsync(managerId, ct)
            ?? throw AppException.Forbidden(ValidationMessage.Loyalty.ManagerNoBranch);

        // Check customer có booking tại branch này không
        if (!await _repo.HasBookingAtBranchAsync(request.UserId, branch.BranchId, ct))
        {
            throw AppException.Forbidden(ValidationMessage.Loyalty.CustomerNoBookingAtBranch);
        }

        var account = await _repo.GetByUserIdAsync(request.UserId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Loyalty.AccountNotFound);

        if (request.Points < 0 && account.CurrentPoints + request.Points < 0)
        {
            throw AppException.BadRequest(ValidationMessage.Loyalty.InsufficientPointsToDeduct);
        }

        account.CurrentPoints += request.Points;
        if (request.Points > 0)
        {
            account.LifetimePoints += request.Points;
        }

        var entry = new LoyaltyLedgerEntry
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = request.UserId,
            EntryType = LoyaltyEntryType.Adjust,
            Points = request.Points,
            BalanceAfter = account.CurrentPoints,
            Description = request.Description ?? "Điều chỉnh điểm thủ công",
        };

        await _repo.AddLedgerEntryAsync(entry, ct);
        await _repo.SaveChangesAsync(ct);

        await transaction.CommitAsync(ct);

        account = await _repo.GetByUserIdAsync(request.UserId, ct);
        return await BuildLoyaltyAccountDto(account!, ct);
    }

    /// <summary>Được BookingService gọi để biết số điểm còn dùng được khi resolve redeem lúc quote/create.</summary>
    /// <remarks>Gọi: ILoyaltyRepository.GetByUserIdAsync.</remarks>
    public async Task<int> GetCurrentPointsAsync(Guid userId, CancellationToken ct = default)
    {
        var account = await _repo.GetByUserIdAsync(userId, ct);
        return account?.CurrentPoints ?? 0;
    }

    /// <summary>Hoàn đúng số điểm đã ghi nhận trong ledger khi Pending booking tự hết hạn.</summary>
    public async Task<int> ReleaseRedeemedPointsForBookingAsync(
        Guid userId, Guid bookingId, string reason, CancellationToken ct = default)
    {
        // ExpirePendingBookingsAsync đã mở transaction; serialize với Redeem và các retry khác.
        await _repo.AcquireUserLockAsync(userId, ct);

        if (await _repo.HasLedgerEntryForBookingAsync(bookingId, LoyaltyEntryType.Expire, ct))
            return 0;

        // Booking ghi RedeemedPoints trước khi gọi redeem best-effort,
        // nên đọc ledger thực tế thay vì tin riêng snapshot trên Booking.
        var points = await _repo.GetRedeemedPointsForBookingAsync(bookingId, ct);
        if (points <= 0) return 0;

        var account = await _repo.GetByUserIdAsync(userId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Loyalty.AccountNotFound);

        account.CurrentPoints += points;
        var entry = new LoyaltyLedgerEntry
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = userId,
            BookingId = bookingId,
            EntryType = LoyaltyEntryType.Adjust,
            Points = points,
            BalanceAfter = account.CurrentPoints,
            Description = $"Hoàn {points} điểm: {reason}",
        };

        // AddLedgerEntryAsync tự save; cùng DbContext transaction nên rollback đồng bộ.
        await _repo.AddLedgerEntryAsync(entry, ct);
        return points;
    }

    /// <summary>Được BookingService.CreateAsync/CreateWalkInAsync gọi khi khách dùng điểm giảm giá — chỉ trừ CurrentPoints.</summary>
    /// <remarks>Gọi: ILoyaltyRepository.GetByUserIdAsync → AddLedgerEntryAsync.</remarks>
    public async Task<int> RedeemForBookingAsync(Guid userId, int points, Guid bookingId, CancellationToken ct = default)
    {
        if (points <= 0) return 0;

        // Create/CreateWalkIn đã mở transaction và khóa user; gọi lại lock để contract service tự bảo vệ.
        await _repo.AcquireUserLockAsync(userId, ct);
        if (await _repo.HasLedgerEntryForBookingAsync(bookingId, LoyaltyEntryType.Redeem, ct))
            return 0;

        var account = await _repo.GetByUserIdAsync(userId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Loyalty.AccountNotFound);

        if (account.CurrentPoints < points)
            throw AppException.BadRequest(ValidationMessage.Loyalty.InsufficientPoints(account.CurrentPoints, points));

        account.CurrentPoints -= points;

        var entry = new LoyaltyLedgerEntry
        {
            LoyaltyAccountId = account.LoyaltyAccountId,
            UserId = userId,
            BookingId = bookingId,
            EntryType = LoyaltyEntryType.Redeem,
            Points = -points,
            BalanceAfter = account.CurrentPoints,
            Description = $"Đổi {points} điểm giảm {points:N0}đ cho đơn hàng",
        };

        await _repo.AddLedgerEntryAsync(entry, ct);
        return points;
    }
}
