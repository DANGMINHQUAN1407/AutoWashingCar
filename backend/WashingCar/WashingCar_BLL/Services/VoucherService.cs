using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Voucher;
using WashingCar_Common.Helpers;


namespace WashingCar_BLL.Services;

/// <summary>Soạn thảo, cập nhật, duyệt xem voucher — không xử lý phê duyệt (xem VoucherApprovalService).</summary>
public class VoucherService(
    IVoucherRepository voucherRepo,
    IBranchRepository branchRepo,
    IUserRepository userRepo,
    ILogger<VoucherService> logger) : IVoucherService
{
    private readonly IVoucherRepository _voucherRepo = voucherRepo;
    private readonly IBranchRepository _branchRepo = branchRepo;
    private readonly IUserRepository _userRepo = userRepo;
    private readonly ILogger<VoucherService> _logger = logger;

    /// <summary>Staff soạn bản thảo voucher cho chi nhánh mình — trạng thái ApprovalStatus=Pending, IsActive=false.</summary>
    /// <remarks>
    /// Gọi: IVoucherRepository.ExistsCodeAsync → IUserRepository.GetByIdAsync → IBranchRepository.GetByIdAsync
    /// → AddAsync + SaveChangesAsync → GetByIdAsync (trả về).
    /// </remarks>
    public async Task<VoucherDto> CreateDraftAsync(Guid creatorId, CreateVoucherRequest request, CancellationToken ct = default)
    {
        var (startUtc, endUtc) = NormalizeVoucherValidityRange(request.StartUtc, request.EndUtc);
        ValidateVoucherRequest(request.DiscountType, request.DiscountValue, request.MaxDiscountAmount, startUtc, endUtc);


        var code = request.VoucherCode.Trim().ToUpperInvariant();
        if (await _voucherRepo.ExistsCodeAsync(code, null, ct))
            throw AppException.Conflict(ValidationMessage.Voucher.CodeExists(code));

        var creator = await _userRepo.GetByIdAsync(creatorId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.CreatorNotFound);

        if (creator.Role != UserRole.Staff)
        {
            throw AppException.Forbidden(ValidationMessage.Voucher.OnlyStaffCanCreateDraft);
        }

        if (request.BranchId.HasValue && request.BranchId.Value != creator.BranchId)
            throw AppException.Forbidden(ValidationMessage.Voucher.OnlyOwnBranchVoucher);
        request.BranchId = creator.BranchId;

        if (request.BranchId.HasValue && await _branchRepo.GetByIdAsync(request.BranchId.Value, ct) is null)
            throw AppException.NotFound(ValidationMessage.Voucher.AssignedBranchNotFound);

        var voucher = new Voucher
        {
            VoucherCode       = code,
            VoucherType       = request.VoucherType,
            DiscountType      = request.DiscountType,
            DiscountValue     = request.DiscountValue,
            MinOrderAmount    = request.MinOrderAmount,
            MaxDiscountAmount = request.DiscountType == 2 ? null : request.MaxDiscountAmount,
            Quantity          = request.Quantity,
            UsedCount         = 0,
            StartUtc          = startUtc,
            EndUtc            = endUtc,
            IsActive          = false, // Mặc định chưa được duyệt thì bắt buộc hoạt động = false
            ApprovalStatus    = VoucherApprovalStatus.Pending, // Chờ duyệt
            RequiredPoints    = request.RequiredPoints,
            BranchId          = request.BranchId,
            CreatedByUserId   = creatorId,
            CreatedAtUtc      = DateTime.UtcNow,
            RowVersion        = []
        };

        await _voucherRepo.AddAsync(voucher, ct);
        await _voucherRepo.SaveChangesAsync(ct);

        _logger.LogInformation("Voucher draft {Code} created by User {UserId}", code, creatorId);

        var created = await _voucherRepo.GetByIdAsync(voucher.VoucherId, ct);
        return created!.ToDto();
    }

    /// <summary>Admin tạo voucher hệ thống (BranchId=null) — active + approved ngay, không qua duyệt.</summary>
    /// <remarks>
    /// Gọi: IVoucherRepository.ExistsCodeAsync → IUserRepository.GetByIdAsync → AddAsync + SaveChangesAsync
    /// → GetByIdAsync (trả về).
    /// </remarks>
    public async Task<VoucherDto> CreateAdminVoucherAsync(Guid adminId, CreateVoucherRequest request, CancellationToken ct = default)
    {
        var (startUtc, endUtc) = NormalizeVoucherValidityRange(request.StartUtc, request.EndUtc);
        ValidateVoucherRequest(request.DiscountType, request.DiscountValue, request.MaxDiscountAmount, startUtc, endUtc);


        var code = request.VoucherCode.Trim().ToUpperInvariant();
        if (await _voucherRepo.ExistsCodeAsync(code, null, ct))
            throw AppException.Conflict(ValidationMessage.Voucher.CodeExists(code));

        var creator = await _userRepo.GetByIdAsync(adminId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.CreatorNotFound);

        if (creator.Role != UserRole.Admin)
        {
            throw AppException.Forbidden(ValidationMessage.Voucher.OnlyAdminCanCreateSystemVoucher);
        }

        var voucher = new Voucher
        {
            VoucherCode       = code,
            VoucherType       = request.VoucherType,
            DiscountType      = request.DiscountType,
            DiscountValue     = request.DiscountValue,
            MinOrderAmount    = request.MinOrderAmount,
            MaxDiscountAmount = request.DiscountType == 2 ? null : request.MaxDiscountAmount,
            Quantity          = request.Quantity,
            UsedCount         = 0,
            StartUtc          = startUtc,
            EndUtc            = endUtc,
            IsActive          = true, // Admin tạo là active luôn
            ApprovalStatus    = VoucherApprovalStatus.Approved, // Đã duyệt luôn
            RequiredPoints    = request.RequiredPoints,
            BranchId          = null, // Áp dụng toàn hệ thống
            CreatedByUserId   = adminId,
            ApprovedByUserId  = adminId, // Admin tự duyệt
            ApprovedAtUtc     = DateTime.UtcNow,
            CreatedAtUtc      = DateTime.UtcNow,
            RowVersion        = []
        };

        await _voucherRepo.AddAsync(voucher, ct);
        await _voucherRepo.SaveChangesAsync(ct);

        _logger.LogInformation("Admin voucher {Code} created by User {UserId}", code, adminId);

        var created = await _voucherRepo.GetByIdAsync(voucher.VoucherId, ct);
        return created!.ToDto();
    }

    /// <summary>Staff sửa bản thảo của chính mình — chỉ được khi còn ApprovalStatus=Pending.</summary>
    /// <remarks>
    /// Gọi: IVoucherRepository.GetByIdAsync → IUserRepository.GetByIdAsync → ExistsCodeAsync (excludeId)
    /// → IBranchRepository.GetByIdAsync → SaveChangesAsync → GetByIdAsync (trả về).
    /// </remarks>
    public async Task<VoucherDto> UpdateDraftAsync(Guid userId, Guid voucherId, UpdateVoucherRequest request, CancellationToken ct = default)
    {
        var voucher = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);

        if (voucher.ApprovalStatus != VoucherApprovalStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.Voucher.OnlyEditPendingVoucher);

        if (voucher.CreatedByUserId != userId)
            throw AppException.Forbidden(ValidationMessage.Voucher.OnlyEditOwnVoucher);

        var editor = await _userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.EditorNotFound);

        if (editor.Role == UserRole.Staff || editor.Role == UserRole.Manager)
        {
            if (request.BranchId.HasValue && request.BranchId.Value != editor.BranchId)
                throw AppException.Forbidden(ValidationMessage.Voucher.OnlyUpdateOwnBranchVoucher);
        }

        var (startUtc, endUtc) = NormalizeVoucherValidityRange(request.StartUtc, request.EndUtc);
        ValidateVoucherRequest(request.DiscountType, request.DiscountValue, request.MaxDiscountAmount, startUtc, endUtc);


        var code = request.VoucherCode.Trim().ToUpperInvariant();
        if (await _voucherRepo.ExistsCodeAsync(code, voucherId, ct))
            throw AppException.Conflict(ValidationMessage.Voucher.CodeExists(code));

        if (request.BranchId.HasValue && await _branchRepo.GetByIdAsync(request.BranchId.Value, ct) is null)
            throw AppException.NotFound(ValidationMessage.Voucher.AssignedBranchNotFound);

        voucher.VoucherCode       = code;
        voucher.VoucherType       = request.VoucherType;
        voucher.DiscountType      = request.DiscountType;
        voucher.DiscountValue     = request.DiscountValue;
        voucher.MinOrderAmount    = request.MinOrderAmount;
        voucher.MaxDiscountAmount = request.DiscountType == 2 ? null : request.MaxDiscountAmount;
        voucher.Quantity          = request.Quantity;
        voucher.StartUtc          = startUtc;
        voucher.EndUtc            = endUtc;
        voucher.RequiredPoints    = request.RequiredPoints;
        voucher.BranchId          = request.BranchId;

        await _voucherRepo.SaveChangesAsync(ct);
        _logger.LogInformation("Voucher draft {Id} updated by User {UserId}", voucherId, userId);

        return (await _voucherRepo.GetByIdAsync(voucherId, ct))!.ToDto();
    }

    /// <summary>Chi tiết 1 voucher theo Id. Ném 404 nếu không tồn tại.</summary>
    /// <remarks>Gọi: IVoucherRepository.GetByIdAsync.</remarks>
    public async Task<VoucherDto> GetByIdAsync(Guid voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);
        return voucher.ToDto();
    }

    /// <summary>Duyệt danh sách voucher theo quyền role hiện tại — Customer chỉ thấy approved+active, Staff/Manager chỉ chi nhánh mình.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync (nếu Staff/Manager) → IVoucherRepository.GetPagedAsync.</remarks>
    public async Task<PagedResult<VoucherDto>> BrowseVouchersAsync(Guid userId, string role, VoucherSearchFilter filter, CancellationToken ct = default)
    {
        // Khách hàng chỉ được thấy các voucher đã phê duyệt và đang hoạt động
        if (role == UserRole.Customer)
        {
            filter.ApprovalStatus = VoucherApprovalStatus.Approved;
            filter.IsActive = true;
            filter.IncludeSystemVouchers = true;
        }
        else if (role == UserRole.Manager || role == UserRole.Staff)
        {
            var user = await _userRepo.GetByIdAsync(userId);
            if (user != null)
            {
                if (user.BranchId.HasValue)
                {
                    filter.BranchId = user.BranchId;
                    filter.IncludeSystemVouchers = false; // Staff/Manager chỉ xem voucher của chi nhánh mình, không xem voucher hệ thống của Admin
                }
                else
                {
                    // Manager/Staff with no branch should only see their own branch vouchers (none)
                    filter.BranchId = Guid.Empty;
                    filter.IncludeSystemVouchers = false;
                }
            }
        }

        var (items, total) = await _voucherRepo.GetPagedAsync(filter, ct);

        return new PagedResult<VoucherDto>
        {
            Items      = [.. items.Select(v => v.ToDto())],
            TotalCount = total,
            PageNumber = filter.Page,
            PageSize   = filter.PageSize
        };
    }



    /// <summary>Bật/tắt voucher — Manager chỉ chi nhánh mình, Admin toàn quyền. Bật chỉ được nếu đã Approved.</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → IVoucherRepository.GetByIdAsync → SaveChangesAsync → GetByIdAsync.</remarks>
    public async Task<VoucherDto> SetActiveAsync(Guid userId, Guid voucherId, bool isActive, CancellationToken ct = default)
    {
        var user = await _userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

        var voucher = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Voucher.NotFound);

        if (user.Role == UserRole.Manager)
        {
            if (!voucher.BranchId.HasValue || voucher.BranchId.Value != user.BranchId)
            {
                throw AppException.Forbidden(ValidationMessage.Voucher.ManagerOnlyOwnBranchToggle);
            }
        }
        else if (user.Role != UserRole.Admin)
        {
            throw AppException.Forbidden(ValidationMessage.Voucher.NoPermissionForAction);
        }

        if (isActive)
        {
            if (voucher.ApprovalStatus != VoucherApprovalStatus.Approved)
                throw AppException.BadRequest(ValidationMessage.Voucher.OnlyActivateApproved);
        }

        voucher.IsActive = isActive;
        await _voucherRepo.SaveChangesAsync(ct);

        _logger.LogInformation("Voucher {Code} active state set to {State} by User {UserId}", voucher.VoucherCode, isActive, userId);
        return (await _voucherRepo.GetByIdAsync(voucherId, ct))!.ToDto();
    }

    /// <summary>
    /// Chuẩn hóa ngày người dùng chọn theo lịch Việt Nam về khoảng UTC.
    /// Voucher có hiệu lực từ đầu ngày bắt đầu đến cuối ngày kết thúc.
    /// </summary>
    private static (DateTime StartUtc, DateTime EndUtc) NormalizeVoucherValidityRange(DateTime start, DateTime end)
        => (
            VietnamTimeHelper.VietnamDateStartToUtc(start),
            VietnamTimeHelper.VietnamDateEndToUtc(end)
        );


    private static void ValidateVoucherRequest(byte discountType, decimal value, decimal? maxDiscount, DateTime start, DateTime end)
    {
        if (end <= start)
            throw AppException.BadRequest(ValidationMessage.Voucher.EndDateMustBeAfterStart);

        if (discountType == 1) // Percentage
        {
            if (value < 5 || value > 100)
                throw AppException.BadRequest(ValidationMessage.Voucher.PercentageRange);
            if (!maxDiscount.HasValue)
                throw AppException.BadRequest(ValidationMessage.Voucher.PercentageRequiresMaxDiscount);
        }
        else if (discountType == 2) // Fixed amount
        {
            if (value <= 0)
                throw AppException.BadRequest(ValidationMessage.Voucher.FixedAmountMustBePositive);
            if (maxDiscount.HasValue)
                throw AppException.BadRequest(ValidationMessage.Voucher.FixedAmountNoMaxDiscount);
        }
        else
        {
            throw AppException.BadRequest(ValidationMessage.Voucher.InvalidDiscountType);
        }
    }

    public async Task DeleteVoucherAsync(Guid voucherId, CancellationToken ct = default)
    {
        var voucher = await _voucherRepo.GetByIdAsync(voucherId, ct)
            ?? throw AppException.NotFound("Voucher không tồn tại.");

        _voucherRepo.Delete(voucher);
        await _voucherRepo.SaveChangesAsync(ct);
    }
}
