using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Tier;

namespace WashingCar_BLL.Services;

public class TierService : ITierService
{
    private readonly ITierRepository _repo;
    private readonly ILogger<TierService> _logger;

    public TierService(ITierRepository repo, ILogger<TierService> logger)
    {
        _repo = repo;
        _logger = logger;
    }

    // Tạo hạng mới (VD: Member, Silver, Gold, Platinum)
    // Check trùng tên + trùng mốc điểm → tạo entity → lưu DB
    /// <summary>Tạo hạng mới — check trùng tên và trùng mốc điểm (2 unique index độc lập).</summary>
    /// <remarks>Gọi: ITierRepository.ExistsNameAsync + ExistsMinPointsAsync → AddAsync.</remarks>
    public async Task<TierDto> CreateAsync(CreateTierRequest request, CancellationToken ct = default)
    {
        if (await _repo.ExistsNameAsync(request.TierName, ct: ct))
        {
            throw AppException.Conflict(ValidationMessage.Tier.NameExists);
        }

        if (await _repo.ExistsMinPointsAsync(request.MinPoints, ct: ct))
        {
            throw AppException.Conflict(ValidationMessage.Tier.MinPointsExists);
        }

        var tier = new Tier
        {
            TierName = request.TierName,
            MinPoints = request.MinPoints,
            EarnRate = request.EarnRate,
            IsActive = true,
        };

        await _repo.AddAsync(tier, ct);
        _logger.LogInformation("Created tier {TierName} MinPoints={MinPoints}", tier.TierName, tier.MinPoints);
        return tier.ToDto();
    }

    // Lấy tất cả hạng active, ORDER BY MinPoints (cho Customer xem bảng hạng)
    /// <summary>Danh sách các hạng đang hoạt động, sắp theo mốc điểm tăng dần. Dùng khi hiển thị lộ trình hạng cho khách.</summary>
    /// <remarks>Gọi: ITierRepository.GetAllActiveOrderedAsync.</remarks>
    public async Task<List<TierDto>> GetAllActiveAsync(CancellationToken ct = default)
    {
        var tiers = await _repo.GetAllActiveOrderedAsync(ct);
        return tiers.Select(t => t.ToDto()).ToList();
    }

    // Lấy danh sách hạng có phân trang (cho Admin quản lý), lọc theo IsActive, sort theo MinPoints
    /// <summary>Danh sách tất cả các hạng (cả đang tắt), có lọc + phân trang. Dùng cho màn hình quản lý của Admin.</summary>
    /// <remarks>Gọi: ITierRepository.GetAllPaginatedAsync.</remarks>
    public async Task<PagedResult<TierDto>> GetAllPaginatedAsync(TierQuery query, CancellationToken ct = default)
    {
        var (items, totalCount) = await _repo.GetAllPaginatedAsync(query, ct);
        return new PagedResult<TierDto>
        {
            Items = items.Select(t => t.ToDto()).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize
        };
    }

    // Xem chi tiết 1 hạng theo id → NotFound nếu không có
    /// <summary>Chi tiết 1 hạng theo Id. Ném 404 nếu không tồn tại.</summary>
    /// <remarks>Gọi: ITierRepository.GetByIdAsync.</remarks>
    public async Task<TierDto> GetByIdAsync(Guid tierId, CancellationToken ct = default)
    {
        var tier = await _repo.GetByIdAsync(tierId, ct);
        if (tier == null)
        {
            throw AppException.NotFound(ValidationMessage.Tier.NotFound);
        }
        return tier.ToDto();
    }

    // Bật/tắt hạng. Nếu tắt → check có member đang ở hạng này không → Conflict nếu có
    /// <summary>Bật/tắt hạng — tắt chỉ được nếu không còn member đang ở hạng này.</summary>
    /// <remarks>Gọi: ITierRepository.GetByIdAsync + HasLoyaltyAccountsAsync (nếu tắt) → SaveChangesAsync.</remarks>
    public async Task SetActiveAsync(Guid tierId, bool isActive, CancellationToken ct = default)
    {
        var tier = await _repo.GetByIdAsync(tierId , ct);
        if(tier == null)
        {
            throw AppException.NotFound(ValidationMessage.Tier.NotFound);
        }

        if(!isActive && await _repo.HasLoyaltyAccountsAsync(tierId, ct))
        {
            throw AppException.Conflict(ValidationMessage.Tier.HasActiveMembersCannotDeactivate);
        }

        if(tier.IsActive == isActive) return;

        tier.IsActive = isActive;
        await _repo.SaveChangesAsync(ct);
        _logger.LogInformation("{Action} tier {TierName} MinPoints={MinPoints}", isActive ? "Activated" : "Deactivated", tier.TierName, tier.MinPoints);
    }

    // Cập nhật hạng. Check trùng tên + mốc điểm (excludeId = tierId → bỏ qua chính nó)
    /// <summary>Cập nhật hạng (tên/mốc điểm/tỷ lệ tích điểm). Tên và mốc điểm phải vẫn duy nhất (bỏ qua chính nó).</summary>
    /// <remarks>Gọi: ITierRepository.GetByIdAsync + ExistsNameAsync + ExistsMinPointsAsync (excludeId) → SaveChangesAsync.</remarks>
    public async Task<TierDto> UpdateAsync(Guid tierId, UpdateTierRequest request, CancellationToken ct = default)
    {
        var tier = await _repo.GetByIdAsync(tierId, ct);
        if (tier == null)
        {
            throw AppException.NotFound(ValidationMessage.Tier.NotFound);
        }

        var tierName = await _repo.ExistsNameAsync(request.TierName, excludeId: tierId, ct: ct);
        if (tierName)
        {
            throw AppException.Conflict(ValidationMessage.Tier.NameExists);
        }

        var minPoints = await _repo.ExistsMinPointsAsync(request.MinPoints, excludeId: tierId, ct: ct);
        if (minPoints)
        {
            throw AppException.Conflict(ValidationMessage.Tier.MinPointsExists);
        }

        tier.TierName = request.TierName;
        tier.MinPoints = request.MinPoints;
        tier.EarnRate = request.EarnRate;
        tier.Benefits = request.Benefits;

        await _repo.SaveChangesAsync(ct);
        _logger.LogInformation("Updated tier {TierName} MinPoints={MinPoints}", tier.TierName, tier.MinPoints);
        return tier.ToDto();
    }

}
