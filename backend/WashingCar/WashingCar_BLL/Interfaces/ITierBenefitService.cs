using WashingCar_Domain.DTOs.TierBenefit;

namespace WashingCar_BLL.Interfaces;

public interface ITierBenefitService
{
    // Lấy tất cả benefits của 1 tier — Customer xem quyền lợi, Admin quản lý
    Task<List<TierBenefitDto>> GetByTierIdAsync(Guid tierId, CancellationToken ct = default);

    // Tạo benefit mới cho tier — Admin
    Task<TierBenefitDto> CreateAsync(Guid tierId, CreateTierBenefitRequest request, CancellationToken ct = default);

    // Cập nhật benefit — Admin
    Task<TierBenefitDto> UpdateAsync(Guid tierBenefitId, UpdateTierBenefitRequest request, CancellationToken ct = default);

    // Bật/tắt benefit — Admin
    Task SetActiveAsync(Guid tierBenefitId, bool isActive, CancellationToken ct = default);

    // Xóa benefit (hard delete) — Admin
    Task DeleteAsync(Guid tierBenefitId, CancellationToken ct = default);
}
