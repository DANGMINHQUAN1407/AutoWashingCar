using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_Domain.DTOs.Slot;

namespace WashingCar_API.Controllers;

/// <summary>
/// Quản lý slot thời gian cho chi nhánh.
/// Manager chỉ thao tác được slot của chi nhánh mình (branchId lấy từ token).
/// Admin phải truyền branchId trong request.
/// </summary>
[Route("api/slots")]
public class SlotController(ISlotService slotService, IBranchService branchService) : BaseApiController
{
    private readonly ISlotService   _slotService   = slotService;
    private readonly IBranchService _branchService = branchService;

    // ── Public ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Lấy danh sách slot còn chỗ trống của chi nhánh theo ngày.
    /// Dành cho khách hàng xem lịch trước khi đặt booking.
    /// AvailableCount = Capacity - OnlineReservedCount - WalkInReservedCount.
    /// </summary>
    /// <remarks>Gọi: SlotService.GetAvailableAsync → ISlotRepository.GetAvailableAsync.</remarks>
    [HttpGet("available")]
    [AllowAnonymous]
    public async Task<IActionResult> GetAvailable(
        [FromQuery] Guid branchId, [FromQuery] DateOnly date, CancellationToken ct)
    {
        var slots = await _slotService.GetAvailableAsync(branchId, date, ct);
        return Success(slots);
    }

    // ── Manager / Admin ──────────────────────────────────────────────────────

    /// <summary>
    /// Lấy tất cả slot của chi nhánh, hỗ trợ filter theo ngày và phân trang.
    /// Manager: tự động lấy branchId từ token (không cần truyền).
    /// Admin: phải truyền branchId trong query string.
    /// </summary>
    /// <remarks>
    /// Gọi: helper ResolveBranchIdAsync (→ BranchService.GetByManagerAsync nếu Manager)
    /// → SlotService.GetPagedAsync → ISlotRepository.GetPagedAsync.
    /// </remarks>
    [HttpGet]
    [Authorize(Roles = $"{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> GetAll([FromQuery] SlotQuery query, CancellationToken ct)
    {
        var branchId = await ResolveBranchIdAsync(query.BranchId, ct);
        var result   = await _slotService.GetPagedAsync(branchId, query, ct);
        return Paged(result);
    }

    /// <summary>
    /// Lấy thông tin chi tiết 1 slot theo ID.
    /// </summary>
    /// <remarks>Gọi: SlotService.GetByIdAsync → ISlotRepository.GetByIdAsync.</remarks>
    [HttpGet("{id:guid}")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var managerBranchId = await ResolveBranchIdAsync(null, ct);
        var slot = await _slotService.GetByIdAsync(id, managerBranchId, ct);
        return Success(slot);
    }

    /// <summary>
    /// Tạo 1 slot thủ công cho chi nhánh.
    /// Validate: EndTime phải sau StartTime, không được trùng slot cùng (BranchId, Date, StartTime).
    /// </summary>
    /// <remarks>
    /// Gọi: helper ResolveBranchIdAsync → SlotService.CreateAsync → ISlotRepository.ExistsAsync → AddAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> Create([FromBody] CreateSlotRequest request, CancellationToken ct)
    {
        var branchId = await ResolveBranchIdAsync(null, ct);
        var slot     = await _slotService.CreateAsync(branchId, request, ct);
        return Created(nameof(GetById), new { id = slot.SlotInventoryId }, slot, "Tạo slot thành công.");
    }

    /// <summary>
    /// Tạo hàng loạt slot theo khoảng ngày và giờ làm việc.
    /// Ví dụ: FromDate=01/07, ToDate=07/07, OpenTime=08:00, CloseTime=18:00, Duration=60
    /// → tạo 10 slot/ngày × 7 ngày = 70 slot.
    /// Slot đã tồn tại sẽ bị bỏ qua (idempotent — gọi lại không bị lỗi).
    /// Trả về số slot được tạo mới.
    /// </summary>
    /// <remarks>
    /// Gọi: helper ResolveBranchIdAsync → SlotService.GenerateAsync → ISlotRepository.ExistsAsync (loop)
    /// → AddRangeAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost("generate")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> Generate([FromBody] GenerateSlotsRequest request, CancellationToken ct)
    {
        var branchId = await ResolveBranchIdAsync(null, ct);
        var count    = await _slotService.GenerateAsync(branchId, request, ct);
        return Success(new { Generated = count }, $"Đã tạo {count} slot.");
    }

    /// <summary>
    /// Cập nhật capacity (sức chứa) của slot.
    /// Chỉ được chỉnh capacity, không được đổi ngày/giờ (phải xóa rồi tạo lại).
    /// </summary>
    /// <remarks>Gọi: SlotService.UpdateAsync → ISlotRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSlotRequest request, CancellationToken ct)
    {
        var managerBranchId = await ResolveBranchIdAsync(null, ct);
        var slot = await _slotService.UpdateAsync(id, request, managerBranchId, ct);
        return Success(slot, "Cập nhật slot thành công.");
    }

    /// <summary>
    /// Xóa slot khỏi hệ thống (hard delete).
    /// Từ chối nếu slot đã có booking — phải hủy booking trước.
    /// </summary>
    /// <remarks>
    /// Gọi: SlotService.DeleteAsync → ISlotRepository.GetByIdAsync + HasBookingsAsync → RemoveAsync + SaveChangesAsync.
    /// </remarks>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var managerBranchId = await ResolveBranchIdAsync(null, ct);
        await _slotService.DeleteAsync(id, managerBranchId, ct);
        return Success("Đã xóa slot.");
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Manager: lấy branchId từ chi nhánh mà họ đang quản lý (Branch.ManagerId = CurrentUserId).
    /// Admin: lấy branchId từ tham số truyền vào, bắt buộc phải có.
    /// </summary>
    private async Task<Guid> ResolveBranchIdAsync(Guid? adminBranchId, CancellationToken ct)
    {
        if (User.IsInRole(UserRole.Manager))
        {
            var branch = await _branchService.GetByManagerAsync(CurrentUserId, ct);
            return branch.BranchId;
        }

        return adminBranchId
            ?? throw AppException.BadRequest("BranchId là bắt buộc với Admin");
    }
}
