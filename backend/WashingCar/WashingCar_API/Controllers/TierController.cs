using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Tier;
using WashingCar_Domain.DTOs.TierBenefit;

namespace WashingCar_API.Controllers;

/// <summary>Quản lý hạng thành viên (Tier) và quyền lợi từng hạng (TierBenefit) — inject 2 Service.</summary>
[Route("api/tiers")]
public class TierController(ITierService service, ITierBenefitService benefitService) : BaseApiController
{
    private readonly ITierService _service = service;
    private readonly ITierBenefitService _benefitService = benefitService;

    // ── Tier CRUD ─────────────────────────────────────────────────────────────

    /// <summary>Danh sách hạng có phân trang (Admin quản lý).</summary>
    /// <remarks>Gọi: TierService.GetAllPaginatedAsync → ITierRepository.GetAllPaginatedAsync.</remarks>
    [HttpGet]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetAll([FromQuery] TierQuery query, CancellationToken ct)
    {
        var result = await _service.GetAllPaginatedAsync(query, ct);
        return Paged(result);
    }

    /// <summary>Danh sách hạng active, sort theo MinPoints (Customer xem bảng hạng).</summary>
    /// <remarks>Gọi: TierService.GetAllActiveAsync → ITierRepository.GetAllActiveOrderedAsync.</remarks>
    [AllowAnonymous]
    [HttpGet("active")]
    public async Task<IActionResult> GetAllActive(CancellationToken ct)
    {
        var result = await _service.GetAllActiveAsync(ct);
        return Success(result);
    }

    /// <summary>Chi tiết 1 hạng.</summary>
    /// <remarks>Gọi: TierService.GetByIdAsync → ITierRepository.GetByIdAsync.</remarks>
    [AllowAnonymous]
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var item = await _service.GetByIdAsync(id, ct);
        return Success(item);
    }

    /// <summary>Tạo hạng mới (VD: Member 0đ, Silver 1000đ, Gold 5000đ).</summary>
    /// <remarks>
    /// Gọi: TierService.CreateAsync → ITierRepository.ExistsNameAsync + ExistsMinPointsAsync → AddAsync.
    /// </remarks>
    [HttpPost]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateTierRequest request, CancellationToken ct)
    {
        var item = await _service.CreateAsync(request, ct);
        return Created(nameof(GetById), new { id = item.TierId }, item, "Tạo hạng thành viên thành công.");
    }

    /// <summary>Cập nhật hạng (tên, mốc điểm, tỉ lệ tích điểm, quyền lợi).</summary>
    /// <remarks>
    /// Gọi: TierService.UpdateAsync → ITierRepository.GetByIdAsync + ExistsNameAsync + ExistsMinPointsAsync → SaveChangesAsync.
    /// </remarks>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTierRequest request, CancellationToken ct)
    {
        var item = await _service.UpdateAsync(id, request, ct);
        return Success(item, "Cập nhật hạng thành viên thành công.");
    }

    /// <summary>Bật hạng.</summary>
    /// <remarks>Gọi: TierService.SetActiveAsync(true) → ITierRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    [HttpPost("{id:guid}/activate")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Activate(Guid id, CancellationToken ct)
    {
        await _service.SetActiveAsync(id, true, ct);
        return Success("Đã kích hoạt hạng thành viên.");
    }

    /// <summary>Tắt hạng (chỉ được nếu không có member đang ở hạng này).</summary>
    /// <remarks>Gọi: TierService.SetActiveAsync(false) → ITierRepository.GetByIdAsync + HasLoyaltyAccountsAsync → SaveChangesAsync.</remarks>
    [HttpPost("{id:guid}/deactivate")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        await _service.SetActiveAsync(id, false, ct);
        return Success("Đã vô hiệu hóa hạng thành viên.");
    }

    // ── Tier Benefits ─────────────────────────────────────────────────────────

    /// <summary>Xem quyền lợi của 1 hạng (Customer xem bảng quyền lợi, Admin quản lý).</summary>
    /// <remarks>Gọi: TierBenefitService.GetByTierIdAsync → ITierRepository.GetByIdAsync → ITierBenefitRepository.GetByTierIdAsync.</remarks>
    [AllowAnonymous]
    [HttpGet("{tierId:guid}/benefits")]
    public async Task<IActionResult> GetBenefits(Guid tierId, CancellationToken ct)
    {
        var result = await _benefitService.GetByTierIdAsync(tierId, ct);
        return Success(result);
    }

    /// <summary>Thêm quyền lợi cho hạng (Admin).</summary>
    /// <remarks>
    /// Gọi: TierBenefitService.CreateAsync → ITierRepository.GetByIdAsync → ITierBenefitRepository.ExistsAsync → AddAsync.
    /// </remarks>
    [HttpPost("{tierId:guid}/benefits")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> CreateBenefit(Guid tierId, [FromBody] CreateTierBenefitRequest request, CancellationToken ct)
    {
        var item = await _benefitService.CreateAsync(tierId, request, ct);
        return Success(item, "Thêm quyền lợi thành công.");
    }

    /// <summary>Sửa giá trị quyền lợi (Admin).</summary>
    /// <remarks>
    /// Gọi: TierBenefitService.UpdateAsync → ITierBenefitRepository.GetByIdAsync + ExistsAsync → SaveChangesAsync.
    /// </remarks>
    [HttpPut("benefits/{benefitId:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> UpdateBenefit(Guid benefitId, [FromBody] UpdateTierBenefitRequest request, CancellationToken ct)
    {
        var item = await _benefitService.UpdateAsync(benefitId, request, ct);
        return Success(item, "Cập nhật quyền lợi thành công.");
    }

    /// <summary>Bật lại quyền lợi đã tắt (Admin).</summary>
    /// <remarks>Gọi: TierBenefitService.SetActiveAsync(true) → ITierBenefitRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    [HttpPost("benefits/{benefitId:guid}/activate")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> ActivateBenefit(Guid benefitId, CancellationToken ct)
    {
        await _benefitService.SetActiveAsync(benefitId, true, ct);
        return Success("Đã kích hoạt quyền lợi.");
    }

    /// <summary>Tạm tắt quyền lợi (Admin).</summary>
    /// <remarks>Gọi: TierBenefitService.SetActiveAsync(false) — cùng chuỗi với ActivateBenefit.</remarks>
    [HttpPost("benefits/{benefitId:guid}/deactivate")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> DeactivateBenefit(Guid benefitId, CancellationToken ct)
    {
        await _benefitService.SetActiveAsync(benefitId, false, ct);
        return Success("Đã vô hiệu hóa quyền lợi.");
    }

    /// <summary>Xóa vĩnh viễn quyền lợi (Admin, hard delete).</summary>
    /// <remarks>Gọi: TierBenefitService.DeleteAsync → ITierBenefitRepository.GetByIdAsync → RemoveAsync.</remarks>
    [HttpDelete("benefits/{benefitId:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> DeleteBenefit(Guid benefitId, CancellationToken ct)
    {
        await _benefitService.DeleteAsync(benefitId, ct);
        return Success("Đã xóa quyền lợi.");
    }
}
