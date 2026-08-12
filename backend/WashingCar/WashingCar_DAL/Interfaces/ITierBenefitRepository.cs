using WashingCar_DAL.Entities;

namespace WashingCar_DAL.Interfaces;

public interface ITierBenefitRepository
{
    // Lấy danh sách benefits của 1 tier — dùng bởi Service.GetByTierIdAsync
    Task<List<TierBenefit>> GetByTierIdAsync(Guid tierId, CancellationToken ct = default);

    // Lấy 1 benefit theo id (có tracking để update) — dùng bởi Service khi Update, Delete, SetActive
    Task<TierBenefit?> GetByIdAsync(Guid tierBenefitId, CancellationToken ct = default);

    // Check trùng: 1 tier chỉ có 1 benefit mỗi loại — dùng bởi Service khi Create + Update
    // excludeId để bỏ qua chính nó khi update
    Task<bool> ExistsAsync(Guid tierId, byte benefitType, Guid? excludeId = null, CancellationToken ct = default);

    // Thêm benefit mới — dùng bởi Service.CreateAsync
    Task AddAsync(TierBenefit benefit, CancellationToken ct = default);

    // Xóa benefit (hard delete) — dùng bởi Service.DeleteAsync
    Task RemoveAsync(TierBenefit benefit, CancellationToken ct = default);

    // Lưu thay đổi — dùng bởi Service khi Update, SetActive
    Task SaveChangesAsync(CancellationToken ct = default);
}
