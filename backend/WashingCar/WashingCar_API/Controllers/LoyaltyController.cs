using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Loyalty;

namespace WashingCar_API.Controllers;

[Route("api/loyalty")]
public class LoyaltyController(ILoyaltyService service) : BaseApiController
{
    private readonly ILoyaltyService _service = service;

    /// <summary>Customer xem hạng + điểm của mình (tự tạo account hạng thấp nhất nếu chưa có).</summary>
    /// <remarks>
    /// Gọi: LoyaltyService.GetMyLoyaltyAsync → helper GetOrCreateAccountAsync (→ ILoyaltyRepository.GetByUserIdAsync
    /// + ITierRepository.GetAllActiveOrderedAsync + AddAccountAsync) → helper BuildLoyaltyAccountDto
    /// (→ ITierRepository.GetAllActiveOrderedAsync).
    /// </remarks>
    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> GetMyLoyalty(CancellationToken ct)
    {
        var result = await _service.GetMyLoyaltyAsync(CurrentUserId, ct);
        return Success(result);
    }

    /// <summary>Customer xem lịch sử cộng/trừ điểm.</summary>
    /// <remarks>Gọi: LoyaltyService.GetLedgerAsync → ILoyaltyRepository.GetByUserIdAsync → GetLedgerAsync.</remarks>
    [HttpGet("me/history")]
    [Authorize]
    public async Task<IActionResult> GetMyLedger([FromQuery] LoyaltyLedgerQuery query, CancellationToken ct)
    {
        var result = await _service.GetLedgerAsync(CurrentUserId, query, ct);
        return Paged(result);
    }

    /// <summary>Admin/Manager xem loyalty của 1 user (không tự tạo account — NotFound nếu chưa có).</summary>
    /// <remarks>Gọi: LoyaltyService.GetByUserIdAsync → ILoyaltyRepository.GetByUserIdAsync → helper BuildLoyaltyAccountDto.</remarks>
    [HttpGet("users/{userId:guid}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Manager}")]
    public async Task<IActionResult> GetByUserId(Guid userId, CancellationToken ct)
    {
        var result = await _service.GetByUserIdAsync(userId, ct);
        return Success(result);
    }

    /// <summary>Admin/Manager xem lịch sử điểm của 1 user.</summary>
    /// <remarks>Gọi: LoyaltyService.GetLedgerAsync — cùng chuỗi với GetMyLedger.</remarks>
    [HttpGet("users/{userId:guid}/history")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Manager}")]
    public async Task<IActionResult> GetUserLedger(Guid userId, [FromQuery] LoyaltyLedgerQuery query, CancellationToken ct)
    {
        var result = await _service.GetLedgerAsync(userId, query, ct);
        return Paged(result);
    }

    /// <summary>Manager điều chỉnh điểm thủ công cho khách tại chi nhánh mình (chỉ khách có booking tại đó).</summary>
    /// <remarks>
    /// Gọi: LoyaltyService.AdjustPointsAsync → IBranchRepository.GetByManagerIdAsync
    /// → ILoyaltyRepository.HasBookingAtBranchAsync + GetByUserIdAsync → AddLedgerEntryAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost("adjust")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> AdjustPoints([FromBody] AdjustPointsRequest request, CancellationToken ct)
    {
        var result = await _service.AdjustPointsAsync(CurrentUserId, request, ct);
        return Success(result, "Điều chỉnh điểm thành công.");
    }
}
