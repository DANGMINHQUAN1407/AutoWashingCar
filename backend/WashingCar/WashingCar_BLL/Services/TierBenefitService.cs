using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.TierBenefit;

namespace WashingCar_BLL.Services;

public class TierBenefitService : ITierBenefitService
{
    private readonly ITierBenefitRepository _repo;
    private readonly ITierRepository _tierRepo;
    private readonly ILogger<TierBenefitService> _logger;

    public TierBenefitService(ITierBenefitRepository repo, ITierRepository tierRepo, ILogger<TierBenefitService> logger)
    {
        _repo = repo;
        _tierRepo = tierRepo;
        _logger = logger;
    }

    // Lấy danh sách quyền lợi của 1 hạng
    // Check tier tồn tại → query benefits → map ToDto
    // Ai dùng: Customer xem bảng quyền lợi, Admin quản lý
    /// <summary>Danh sách quyền lợi của 1 hạng (giảm %, số ngày đặt trước...). Ném 404 nếu hạng không tồn tại.</summary>
    /// <remarks>Gọi: ITierRepository.GetByIdAsync → ITierBenefitRepository.GetByTierIdAsync.</remarks>
    public async Task<List<TierBenefitDto>> GetByTierIdAsync(Guid tierId, CancellationToken ct)
    {
        var tier = await _tierRepo.GetByIdAsync(tierId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Tier.NotFound);

        var benefits = await _repo.GetByTierIdAsync(tierId, ct);
        return benefits.Select(b => b.ToDto()).ToList();
    }

    // Thêm quyền lợi cho hạng (VD: Gold → DiscountPercent = "10")
    // Check tier tồn tại → check trùng (1 tier chỉ 1 benefit mỗi type) → tạo → lưu
    // Ai dùng: Admin
    /// <summary>Thêm quyền lợi cho hạng — 1 tier chỉ được 1 benefit mỗi loại (unique theo cặp TierId+BenefitType).</summary>
    /// <remarks>Gọi: ITierRepository.GetByIdAsync → ITierBenefitRepository.ExistsAsync → AddAsync.</remarks>
    public async Task<TierBenefitDto> CreateAsync(Guid tierId, CreateTierBenefitRequest request, CancellationToken ct)
    {
        var tier = await _tierRepo.GetByIdAsync(tierId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Tier.NotFound);

        if (await _repo.ExistsAsync(tierId, request.BenefitType, ct: ct))
            throw AppException.Conflict(ValidationMessage.TierBenefit.DuplicateType);

        ValidateBenefitValue(request.BenefitType, request.BenefitValue);

        var benefit = new TierBenefit
        {
            TierId = tierId,
            BenefitType = request.BenefitType,
            BenefitValue = request.BenefitValue,
            Description = request.Description,
            IsActive = true,
        };

        await _repo.AddAsync(benefit, ct);
        _logger.LogInformation("Created benefit Type={Type} for tier {TierId}", request.BenefitType, tierId);
        return benefit.ToDto();
    }

    // Sửa giá trị quyền lợi (VD: DiscountPercent từ "10" → "15")
    // Tìm benefit → check trùng type nếu đổi type (excludeId) → cập nhật → save
    // Ai dùng: Admin
    /// <summary>Cập nhật giá trị/loại quyền lợi. Loại benefit phải vẫn duy nhất trong hạng (bỏ qua chính nó).</summary>
    /// <remarks>Gọi: ITierBenefitRepository.GetByIdAsync + ExistsAsync (excludeId) → SaveChangesAsync.</remarks>
    public async Task<TierBenefitDto> UpdateAsync(Guid tierBenefitId, UpdateTierBenefitRequest request, CancellationToken ct)
    {
        var benefit = await _repo.GetByIdAsync(tierBenefitId, ct)
            ?? throw AppException.NotFound(ValidationMessage.TierBenefit.NotFound);

        if (await _repo.ExistsAsync(benefit.TierId, request.BenefitType, excludeId: tierBenefitId, ct: ct))
            throw AppException.Conflict(ValidationMessage.TierBenefit.DuplicateType);

        ValidateBenefitValue(request.BenefitType, request.BenefitValue);

        benefit.BenefitType = request.BenefitType;
        benefit.BenefitValue = request.BenefitValue;
        benefit.Description = request.Description;

        await _repo.SaveChangesAsync(ct);
        _logger.LogInformation("Updated benefit {BenefitId}", tierBenefitId);
        return benefit.ToDto();
    }

    // Tạm tắt/bật 1 quyền lợi mà không xóa
    // Ai dùng: Admin
    /// <summary>Bật/tắt 1 quyền lợi. Chỉ quyền lợi đang bật mới được áp khi tính ưu đãi cho khách.</summary>
    /// <remarks>Gọi: ITierBenefitRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    public async Task SetActiveAsync(Guid tierBenefitId, bool isActive, CancellationToken ct)
    {
        var benefit = await _repo.GetByIdAsync(tierBenefitId, ct)
            ?? throw AppException.NotFound(ValidationMessage.TierBenefit.NotFound);

        if (benefit.IsActive == isActive) return;

        benefit.IsActive = isActive;
        await _repo.SaveChangesAsync(ct);
        _logger.LogInformation("Benefit {BenefitId} IsActive={IsActive}", tierBenefitId, isActive);
    }

    // Xóa vĩnh viễn 1 quyền lợi khỏi hạng (hard delete)
    // Ai dùng: Admin
    /// <summary>Xoá hẳn 1 quyền lợi khỏi hạng.</summary>
    /// <remarks>Gọi: ITierBenefitRepository.GetByIdAsync → RemoveAsync.</remarks>
    public async Task DeleteAsync(Guid tierBenefitId, CancellationToken ct)
    {
        var benefit = await _repo.GetByIdAsync(tierBenefitId, ct)
            ?? throw AppException.NotFound(ValidationMessage.TierBenefit.NotFound);

        await _repo.RemoveAsync(benefit, ct);
        _logger.LogInformation("Deleted benefit {BenefitId} from tier {TierId}", tierBenefitId, benefit.TierId);
    }

    // BenefitValue là string tự do — chỉ validate format cho 2 loại đang được BookingService đọc và áp dụng thật sự.
    // Các loại còn lại (FreeService, PrioritySupport, BonusPointPercent) chưa có logic tiêu thụ nên chưa validate.
    private static void ValidateBenefitValue(byte benefitType, string benefitValue)
    {
        if (benefitType == BenefitType.DiscountPercent)
        {
            if (!decimal.TryParse(benefitValue, out var percent) || percent <= 0 || percent > 100)
                throw AppException.BadRequest(ValidationMessage.TierBenefit.InvalidDiscountPercent);
        }
        else if (benefitType == BenefitType.AdvanceBookingDays)
        {
            if (!int.TryParse(benefitValue, out var days) || days <= 0)
                throw AppException.BadRequest(ValidationMessage.TierBenefit.InvalidAdvanceBookingDays);
        }
    }
}
