using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Voucher;

namespace WashingCar_API.Controllers;

/// <summary>
/// Voucher: soạn thảo (Staff), phê duyệt (Manager), quản lý gán theo hạng (Admin), đổi điểm lấy voucher (Customer).
/// Inject 3 Service khác nhau cho 3 nhóm chức năng — không phải 1-Controller-1-Service như phần lớn module khác.
/// </summary>
[Route("api/vouchers")]
[Authorize]
public class VoucherController(
    IVoucherService voucherService,
    ILoyaltyVoucherService loyaltyVoucherService,
    IVoucherApprovalService voucherApprovalService) : BaseApiController
{
    private readonly IVoucherService _voucherService = voucherService;
    private readonly ILoyaltyVoucherService _loyaltyVoucherService = loyaltyVoucherService;
    private readonly IVoucherApprovalService _voucherApprovalService = voucherApprovalService;

    private string CurrentUserRole => User.FindFirstValue("role")!;

    // --- FEATURE 7.1: VOUCHER DRAFT ---

    /// <summary>Staff soạn bản thảo voucher cho chi nhánh mình — chờ Manager phê duyệt.</summary>
    /// <remarks>
    /// Gọi: VoucherService.CreateDraftAsync → IVoucherRepository.ExistsCodeAsync → IUserRepository.GetByIdAsync
    /// → IBranchRepository.GetByIdAsync → AddAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost]
    [Authorize(Roles = UserRole.Staff)]
    public async Task<IActionResult> CreateDraft([FromBody] CreateVoucherRequest request, CancellationToken ct)
    {
        var voucher = await _voucherService.CreateDraftAsync(CurrentUserId, request, ct);
        return Created(nameof(GetById), new { id = voucher.VoucherId }, voucher, "Tạo bản thảo voucher thành công");
    }

    /// <summary>Staff sửa bản thảo của chính mình (chỉ khi còn Pending).</summary>
    /// <remarks>
    /// Gọi: VoucherService.UpdateDraftAsync → IVoucherRepository.GetByIdAsync + ExistsCodeAsync
    /// → IUserRepository.GetByIdAsync → IBranchRepository.GetByIdAsync → SaveChangesAsync.
    /// </remarks>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = UserRole.Staff)]
    public async Task<IActionResult> UpdateDraft(Guid id, [FromBody] UpdateVoucherRequest request, CancellationToken ct)
    {
        var voucher = await _voucherService.UpdateDraftAsync(CurrentUserId, id, request, ct);
        return Success(voucher, "Cập nhật bản thảo voucher thành công");
    }

    /// <summary>Admin tạo voucher hệ thống — active và approved ngay, không qua duyệt.</summary>
    /// <remarks>
    /// Gọi: VoucherService.CreateAdminVoucherAsync → IVoucherRepository.ExistsCodeAsync → IUserRepository.GetByIdAsync
    /// → AddAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost("admin")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> CreateAdmin([FromBody] CreateVoucherRequest request, CancellationToken ct)
    {
        var voucher = await _voucherService.CreateAdminVoucherAsync(CurrentUserId, request, ct);
        return Created(nameof(GetById), new { id = voucher.VoucherId }, voucher, "Tạo voucher thành công");
    }

    // --- FEATURE 7.2: VOUCHER APPROVAL ---

    /// <summary>Manager phê duyệt voucher draft — tự động kích hoạt (IsActive=true).</summary>
    /// <remarks>
    /// Gọi: VoucherApprovalService.ApproveAsync → IVoucherRepository.GetByIdAsync → IUserRepository.GetByIdAsync
    /// → SaveChangesAsync.
    /// </remarks>
    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        var voucher = await _voucherApprovalService.ApproveAsync(CurrentUserId, id, ct);
        return Success(voucher, "Đã phê duyệt voucher thành công");
    }

    /// <summary>Manager từ chối voucher draft.</summary>
    /// <remarks>Gọi: VoucherApprovalService.RejectAsync → IVoucherRepository.GetByIdAsync → IUserRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        var voucher = await _voucherApprovalService.RejectAsync(CurrentUserId, id, ct);
        return Success(voucher, "Từ chối phê duyệt voucher thành công");
    }

    // --- FEATURE 7.3: ACTIVE VOUCHER MANAGEMENT ---

    /// <summary>Duyệt danh sách voucher theo quyền của role hiện tại (Customer chỉ thấy approved+active).</summary>
    /// <remarks>Gọi: VoucherService.BrowseVouchersAsync → IUserRepository.GetByIdAsync (nếu Staff/Manager) → IVoucherRepository.GetPagedAsync.</remarks>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> Browse([FromQuery] VoucherSearchFilter filter, CancellationToken ct)
    {
        var role = User.Identity?.IsAuthenticated == true ? CurrentUserRole : UserRole.Customer;
        var userId = User.Identity?.IsAuthenticated == true ? CurrentUserId : Guid.Empty;
        var result = await _voucherService.BrowseVouchersAsync(userId, role, filter, ct);
        return Paged(result);
    }

    /// <summary>Chi tiết 1 voucher.</summary>
    /// <remarks>Gọi: VoucherService.GetByIdAsync → IVoucherRepository.GetByIdAsync.</remarks>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var voucher = await _voucherService.GetByIdAsync(id, ct);
        return Success(voucher);
    }

    /// <summary>Bật/tắt voucher (Manager chỉ chi nhánh mình, Admin toàn quyền).</summary>
    /// <remarks>
    /// Gọi: VoucherService.SetActiveAsync → IUserRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync → SaveChangesAsync.
    /// </remarks>
    [HttpPatch("{id:guid}/active")]
    [Authorize(Roles = $"{UserRole.Manager},{UserRole.Admin}")]
    public async Task<IActionResult> SetActive(Guid id, [FromQuery] bool isActive, CancellationToken ct)
    {
        var voucher = await _voucherService.SetActiveAsync(CurrentUserId, id, isActive, ct);
        var message = isActive ? "Kích hoạt voucher thành công" : "Ngưng kích hoạt voucher thành công";
        return Success(voucher, message);
    }

    /// <summary>Manager phê duyệt hàng loạt.</summary>
    /// <remarks>
    /// Gọi: VoucherApprovalService.BulkApproveAsync → IUserRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync (loop)
    /// → SaveChangesAsync (1 lần cuối).
    /// </remarks>
    [HttpPost("bulk-approve")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> BulkApprove([FromBody] List<Guid> voucherIds, CancellationToken ct)
    {
        if (voucherIds == null || !voucherIds.Any())
            return BadRequest(ApiResponse.Fail("Danh sách ID voucher không được để trống"));

        var approvedVouchers = await _voucherApprovalService.BulkApproveAsync(CurrentUserId, voucherIds, ct);
        return Success(approvedVouchers, $"Phê duyệt hàng loạt {approvedVouchers.Count} voucher thành công");
    }

    /// <summary>Manager từ chối hàng loạt.</summary>
    /// <remarks>Gọi: VoucherApprovalService.BulkRejectAsync — cùng chuỗi với BulkApproveAsync.</remarks>
    [HttpPost("bulk-reject")]
    [Authorize(Roles = UserRole.Manager)]
    public async Task<IActionResult> BulkReject([FromBody] List<Guid> voucherIds, CancellationToken ct)
    {
        if (voucherIds == null || !voucherIds.Any())
            return BadRequest(ApiResponse.Fail("Danh sách ID voucher không được để trống"));

        var rejectedVouchers = await _voucherApprovalService.BulkRejectAsync(CurrentUserId, voucherIds, ct);
        return Success(rejectedVouchers, $"Từ chối phê duyệt hàng loạt {rejectedVouchers.Count} voucher thành công");
    }

    // --- FEATURE: TIER VOUCHER ASSIGNMENTS (ADMIN CRUD) ---

    /// <summary>Gán 1 voucher cho 1 hạng thành viên kèm điểm yêu cầu.</summary>
    /// <remarks>
    /// Gọi: LoyaltyVoucherService.CreateTierVoucherAsync → ITierRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync
    /// + ExistsTierVoucherPairAsync → AddTierVoucherAsync + SaveChangesAsync.
    /// </remarks>
    [HttpPost("tier-assignments")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Staff},{UserRole.Manager}")]
    public async Task<IActionResult> CreateTierVoucher([FromBody] AssignTierVoucherRequest request, CancellationToken ct)
    {
        var result = await _loyaltyVoucherService.CreateTierVoucherAsync(request, ct);
        return Created(nameof(GetTierVoucherById), new { id = result.TierVoucherId }, result, "Gán voucher cho hạng thành viên thành công");
    }

    /// <summary>Sửa điểm yêu cầu của 1 gán voucher-hạng.</summary>
    /// <remarks>Gọi: LoyaltyVoucherService.UpdateTierVoucherAsync → IVoucherRepository.GetTierVoucherByIdAsync → SaveChangesAsync.</remarks>
    [HttpPut("tier-assignments/{id:guid}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Staff},{UserRole.Manager}")]
    public async Task<IActionResult> UpdateTierVoucher(Guid id, [FromBody] int requiredPoints, CancellationToken ct)
    {
        var result = await _loyaltyVoucherService.UpdateTierVoucherAsync(id, requiredPoints, ct);
        return Success(result, "Cập nhật điểm yêu cầu đổi voucher thành công");
    }

    /// <summary>Chi tiết 1 gán voucher-hạng.</summary>
    /// <remarks>Gọi: LoyaltyVoucherService.GetTierVoucherByIdAsync → IVoucherRepository.GetTierVoucherByIdAsync.</remarks>
    [HttpGet("tier-assignments/{id:guid}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Staff},{UserRole.Manager}")]
    public async Task<IActionResult> GetTierVoucherById(Guid id, CancellationToken ct)
    {
        var result = await _loyaltyVoucherService.GetTierVoucherByIdAsync(id, ct);
        return Success(result);
    }

    /// <summary>Danh sách gán voucher-hạng, phân trang.</summary>
    /// <remarks>Gọi: LoyaltyVoucherService.GetTierVouchersPagedAsync → IVoucherRepository.GetTierVouchersPagedAsync.</remarks>
    [HttpGet("tier-assignments")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Staff},{UserRole.Manager}")]
    public async Task<IActionResult> GetTierVouchers([FromQuery] WashingCar_Domain.DTOs.Common.PaginationQuery query, CancellationToken ct)
    {
        var result = await _loyaltyVoucherService.GetTierVouchersPagedAsync(query, ct);
        return Paged(result);
    }

    /// <summary>Gỡ gán voucher-hạng.</summary>
    /// <remarks>Gọi: LoyaltyVoucherService.DeleteTierVoucherAsync → IVoucherRepository.GetTierVoucherByIdAsync → RemoveTierVoucher + SaveChangesAsync.</remarks>
    [HttpDelete("tier-assignments/{id:guid}")]
    [Authorize(Roles = $"{UserRole.Admin},{UserRole.Staff},{UserRole.Manager}")]
    public async Task<IActionResult> DeleteTierVoucher(Guid id, CancellationToken ct)
    {
        await _loyaltyVoucherService.DeleteTierVoucherAsync(id, ct);
        return Success<object?>(null, "Xóa gán voucher cho hạng thành viên thành công");
    }

    // --- FEATURE: LOYALTY VOUCHER REDEMPTION (CUSTOMER) ---

    /// <summary>Danh sách voucher khả dụng để đổi (theo hạng hiện tại). Staff/Manager/Admin có thể xem hộ user khác qua ?userId=.</summary>
    /// <remarks>
    /// Gọi: LoyaltyVoucherService.GetAvailableVouchersAsync → ILoyaltyRepository.GetByUserIdAsync (tự tạo nếu chưa có)
    /// → IVoucherRepository.GetTierVouchersByTierIdAsync + GetTierSpecificVoucherIdsAsync + GetPagedAsync
    /// + HasUserRedeemedVoucherAsync (loop).
    /// </remarks>
    [HttpGet("available")]
    [Authorize]
    public async Task<IActionResult> GetAvailable([FromQuery] Guid? branchId, [FromQuery] Guid? userId, CancellationToken ct)
    {
        var targetUserId = CurrentUserId;
        if (userId.HasValue && (CurrentUserRole == UserRole.Staff || CurrentUserRole == UserRole.Manager || CurrentUserRole == UserRole.Admin))
        {
            targetUserId = userId.Value;
        }

        var result = await _loyaltyVoucherService.GetAvailableVouchersAsync(targetUserId, branchId, ct);
        return Success(result);
    }

    /// <summary>Customer đổi điểm lấy voucher.</summary>
    /// <remarks>
    /// Gọi: LoyaltyVoucherService.RedeemVoucherAsync → ILoyaltyRepository.GetByUserIdAsync → IVoucherRepository.GetByIdAsync
    /// + HasUserRedeemedVoucherAsync + GetTierVouchersByTierIdAsync → ILoyaltyRepository.AddLedgerEntryAsync (nếu tốn điểm)
    /// → IVoucherRepository.AddUserVoucherAsync + SaveChangesAsync + ILoyaltyRepository.SaveChangesAsync.
    /// </remarks>
    [HttpPost("redeem")]
    [Authorize(Roles = UserRole.Customer)]
    public async Task<IActionResult> Redeem([FromBody] RedeemVoucherRequest request, CancellationToken ct)
    {
        var result = await _loyaltyVoucherService.RedeemVoucherAsync(CurrentUserId, request.VoucherId, ct);
        return Success(result, "Đổi voucher thành công");
    }

    /// <summary>Voucher của tôi (tự động nhận thêm voucher hệ thống chưa claim). Staff/Manager/Admin xem hộ qua ?userId=.</summary>
    /// <remarks>
    /// Gọi: LoyaltyVoucherService.GetMyVouchersPagedAsync → IVoucherRepository.GetActiveSystemVouchersAsync
    /// + HasUserRedeemedVoucherAsync + AddUserVoucherAsync (auto-claim voucher hệ thống) → SaveChangesAsync
    /// → GetUserVouchersPagedAsync.
    /// </remarks>
    [HttpGet("my-vouchers")]
    [Authorize]
    public async Task<IActionResult> GetMyVouchers([FromQuery] UserVoucherQuery query, [FromQuery] Guid? userId, CancellationToken ct)
    {
        var targetUserId = CurrentUserId;
        if (userId.HasValue && (CurrentUserRole == UserRole.Staff || CurrentUserRole == UserRole.Manager || CurrentUserRole == UserRole.Admin))
        {
            targetUserId = userId.Value;
        }

        var result = await _loyaltyVoucherService.GetMyVouchersPagedAsync(targetUserId, query, ct);
        return Paged(result);
    }
}
