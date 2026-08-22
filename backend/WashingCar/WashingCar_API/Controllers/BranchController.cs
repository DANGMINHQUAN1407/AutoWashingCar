using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Branch;

namespace WashingCar_API.Controllers;

/// <summary>
/// Quản lý chi nhánh của hệ thống rửa xe.
/// Phân quyền: Public (đọc), Manager (xem chi nhánh mình + gán dịch vụ), Admin (toàn quyền).
/// </summary>
[Route("api/branches")]
public class BranchController(IBranchService service) : BaseApiController
{
    private readonly IBranchService _service = service;

    // ── Public ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Lấy danh sách chi nhánh, filter theo city và isActive, có phân trang.
    /// </summary>
    /// <remarks>Gọi: BranchService.GetAllAsync → IBranchRepository.GetAllAsync.</remarks>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetAll([FromQuery] BranchQuery query, CancellationToken ct)
    {
        var result = await _service.GetAllAsync(query, ct);
        return Paged(result);
    }

    /// <summary>
    /// Lấy thông tin 1 chi nhánh theo ID, include thông tin Manager.
    /// </summary>
    /// <remarks>Gọi: BranchService.GetByIdAsync → IBranchRepository.GetByIdAsync.</remarks>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var branch = await _service.GetByIdAsync(id, ct);
        return Success(branch);
    }

    /// <summary>
    /// Lấy danh sách dịch vụ đang được kích hoạt của chi nhánh đó.
    /// </summary>
    /// <remarks>Gọi: BranchService.GetServicesAsync → IBranchRepository.GetByIdAsync + GetServicesAsync.</remarks>
    [HttpGet("{id:guid}/services")]
    [AllowAnonymous]
    public async Task<IActionResult> GetServices(Guid id, CancellationToken ct)
    {
        var services = await _service.GetServicesAsync(id, ct);
        return Success(services);
    }

    // ── Manager ─────────────────────────────────────────────────────────────

    /// <summary>
    /// Manager lấy thông tin chi nhánh mình đang quản lý.
    /// Tìm theo Branch.ManagerId = token.sub (CurrentUserId).
    /// Trả về 404 nếu chưa được gán vào chi nhánh nào.
    /// </summary>
    /// <remarks>Gọi: BranchService.GetByManagerAsync → IBranchRepository.GetByManagerIdAsync.</remarks>
    [HttpGet("my")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> GetMyBranch(CancellationToken ct)
    {
        var branch = await _service.GetByManagerAsync(CurrentUserId, ct);
        return Success(branch);
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Tạo chi nhánh mới.
    /// Validate: BranchCode chưa tồn tại, ManagerId (nếu có) phải có role Manager và chưa quản lý chi nhánh khác.
    /// </summary>
    /// <remarks>
    /// Gọi: BranchService.CreateAsync → IBranchRepository.GetNextBranchCodeAsync → AddAsync + SaveChangesAsync → GetByIdAsync (trả về).
    /// </remarks>
    [HttpPost]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Create([FromBody] CreateBranchRequest request, CancellationToken ct)
    {
        var branch = await _service.CreateAsync(request, ct);
        return Created(nameof(GetById), new { id = branch.BranchId }, branch, "Tạo chi nhánh thành công.");
    }

    /// <summary>
    /// Cập nhật thông tin chi nhánh.
    /// Chỉ update field nào có giá trị trong request, null = giữ nguyên giá trị cũ.
    /// </summary>
    /// <remarks>Gọi: BranchService.UpdateAsync → IBranchRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBranchRequest request, CancellationToken ct)
    {
        var branch = await _service.UpdateAsync(id, request, ct);
        return Success(branch, "Cập nhật chi nhánh thành công.");
    }

    /// <summary>
    /// Soft delete chi nhánh: set IsActive=false.
    /// Không xóa khỏi DB để giữ lịch sử booking.
    /// </summary>
    /// <remarks>Gọi: BranchService.DeleteAsync → IBranchRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return Success("Đã xóa chi nhánh.");
    }

    /// <summary>
    /// Gán Manager vào chi nhánh.
    /// Validate: user phải có role Manager, chưa quản lý chi nhánh nào khác.
    /// </summary>
    /// <remarks>
    /// Gọi: BranchService.AssignManagerAsync → IBranchRepository.GetByIdAsync + IsManagerAssignedAsync
    /// → IUserRepository.GetByIdAsync + UpdateAsync → IBranchRepository.SaveChangesAsync.
    /// </remarks>
    [HttpPut("{id:guid}/manager")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> AssignManager(Guid id, [FromBody] AssignManagerRequest request, CancellationToken ct)
    {
        var branch = await _service.AssignManagerAsync(id, request.UserId, ct);
        return Success(branch, "Đã gán Manager cho chi nhánh.");
    }

    /// <summary>
    /// Gỡ Manager khỏi chi nhánh (set Branch.ManagerId = null).
    /// </summary>
    /// <remarks>
    /// Gọi: BranchService.RemoveManagerAsync → IBranchRepository.GetByIdAsync → IUserRepository.GetByIdAsync + UpdateAsync
    /// → IBranchRepository.SaveChangesAsync.
    /// </remarks>
    [HttpDelete("{id:guid}/manager")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> RemoveManager(Guid id, CancellationToken ct)
    {
        var branch = await _service.RemoveManagerAsync(id, ct);
        return Success(branch, "Đã gỡ Manager khỏi chi nhánh.");
    }

    /// <summary>
    /// Lấy danh sách Staff đang thuộc chi nhánh.
    /// </summary>
    /// <remarks>Gọi: BranchService.GetStaffAsync → IBranchRepository.GetByIdAsync + GetStaffAsync.</remarks>
    [HttpGet("{id:guid}/staff")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Manager}")]
    public async Task<IActionResult> GetStaff(Guid id, CancellationToken ct)
    {
        var managerId = User.IsInRole(UserRole.Manager)
            ? CurrentUserId
            : (Guid?)null;

        var staff = await _service.GetStaffAsync(id, managerId, ct);
        return Success(staff);
    }

    /// <summary>
    /// Gán danh sách Staff vào chi nhánh: set User.BranchId = branchId.
    /// Validate: mỗi user phải có role Staff.
    /// </summary>
    /// <remarks>
    /// Gọi: BranchService.AssignStaffAsync → IBranchRepository.GetByIdAsync → IUserRepository.GetByIdAsync + UpdateAsync (loop).
    /// </remarks>
    [HttpPost("{id:guid}/staff")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> AssignStaff(Guid id, [FromBody] AssignStaffRequest request, CancellationToken ct)
    {
        await _service.AssignStaffAsync(id, request.UserIds, ct);
        return Success("Đã gán Staff vào chi nhánh.");
    }

    /// <summary>
    /// Gỡ Staff khỏi chi nhánh: set User.BranchId = null.
    /// </summary>
    /// <remarks>Gọi: BranchService.RemoveStaffAsync → IUserRepository.GetByIdAsync → UpdateAsync.</remarks>
    [HttpDelete("{id:guid}/staff/{userId:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> RemoveStaff(Guid id, Guid userId, CancellationToken ct)
    {
        await _service.RemoveStaffAsync(id, userId, ct);
        return Success("Đã gỡ Staff khỏi chi nhánh.");
    }

    /// <summary>
    /// Gán danh sách dịch vụ vào chi nhánh.
    /// Dịch vụ đã tồn tại sẽ được reactivate (IsActive=true), chưa có thì thêm mới vào BranchService.
    /// </summary>
    /// <remarks>
    /// Gọi: BranchService.AssignServicesAsync → IBranchRepository.GetByIdAsync → GetBranchServiceAsync (loop)
    /// → AddBranchServicesAsync → SaveChangesAsync.
    /// </remarks>
    [HttpPost("{id:guid}/services")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Manager}")]
    public async Task<IActionResult> AssignServices(Guid id, [FromBody] AssignServicesRequest request, CancellationToken ct)
    {
        var managerId = User.IsInRole(UserRole.Manager)
            ? CurrentUserId
            : (Guid?)null;

        await _service.AssignServicesAsync(
            id,
            request.ServiceCatalogItemIds,
            managerId,
            ct);
        return Success("Đã gán dịch vụ cho chi nhánh.");
    }

    /// <summary>
    /// Bật hoặc tắt 1 dịch vụ trong chi nhánh (set BranchService.IsActive).
    /// </summary>
    /// <remarks>Gọi: BranchService.ToggleServiceAsync → IBranchRepository.GetBranchServiceAsync → SaveChangesAsync.</remarks>
    [HttpPatch("{id:guid}/services/{serviceId:guid}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Manager}")]
    public async Task<IActionResult> ToggleService(Guid id, Guid serviceId, [FromBody] ToggleServiceRequest request, CancellationToken ct)
    {
        var managerId = User.IsInRole(UserRole.Manager)
            ? CurrentUserId
            : (Guid?)null;

        await _service.ToggleServiceAsync(
            id,
            serviceId,
            request.IsActive,
            managerId,
            ct);
        return Success(request.IsActive ? "Đã bật dịch vụ." : "Đã tắt dịch vụ.");
    }

    /// <summary>
    /// Xóa hẳn dịch vụ khỏi chi nhánh (xóa record BranchService).
    /// </summary>
    /// <remarks>
    /// Gọi: BranchService.RemoveServiceAsync → IBranchRepository.GetBranchServiceAsync → RemoveBranchServiceAsync → SaveChangesAsync.
    /// </remarks>
    [HttpDelete("{id:guid}/services/{serviceId:guid}")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> RemoveService(Guid id, Guid serviceId, CancellationToken ct)
    {
        await _service.RemoveServiceAsync(id, serviceId, ct);
        return Success("Đã gỡ dịch vụ khỏi chi nhánh.");
    }
}
