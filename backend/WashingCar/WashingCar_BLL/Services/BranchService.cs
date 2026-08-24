using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Branch;
using BranchServiceEntity = WashingCar_DAL.Entities.BranchService;

namespace WashingCar_BLL.Services;

/// <summary>
/// Business logic cho quản lý chi nhánh.
/// Các rule quan trọng:
/// - BranchCode phải unique toàn hệ thống.
/// - 1 Manager chỉ được quản lý 1 chi nhánh tại 1 thời điểm.
/// - 1 Staff chỉ thuộc 1 chi nhánh (User.BranchId).
/// - Delete set IsActive=false (soft delete).
/// </summary>
public class BranchService(
    IBranchRepository branchRepo,
    IUserRepository userRepo,
    IServiceCatalogRepository serviceCatalogRepo,
    IServiceVehiclePricingRepository pricingRepo,
    ILogger<BranchService> logger) : IBranchService
{
    private async Task<Branch> GetBranchForManagerScopeAsync(
        Guid branchId,
        Guid? managerId,
        CancellationToken ct)
    {
        var branch = await branchRepo.GetByIdAsync(branchId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        if (managerId.HasValue && branch.ManagerId != managerId.Value)
            throw AppException.Forbidden(ValidationMessage.Branch.ForbiddenOtherBranch);

        return branch;
    }
    /// <summary>Filter theo city/isActive nếu có, phân trang, include Manager.</summary>
    /// <remarks>Gọi: IBranchRepository.GetAllAsync.</remarks>
    public async Task<PagedResult<BranchDto>> GetAllAsync(BranchQuery query, CancellationToken ct = default)
    {
        var (items, total) = await branchRepo.GetAllAsync(query.City, query.IsActive, query.Page, query.PageSize, ct);
        return new PagedResult<BranchDto>
        {
            Items      = items.Select(b => b.ToDto()).ToList(),
            TotalCount = total,
            PageNumber = query.Page,
            PageSize   = query.PageSize,
        };
    }

    /// <summary>Chi tiết 1 chi nhánh theo Id (kèm Manager). Ném 404 nếu không tồn tại.</summary>
    /// <remarks>Gọi: IBranchRepository.GetByIdAsync.</remarks>
    public async Task<BranchDto> GetByIdAsync(Guid branchId, CancellationToken ct = default)
    {
        var branch = await branchRepo.GetByIdAsync(branchId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.NotFound);
        return branch.ToDto();
    }

    /// <summary>Chi nhánh mà 1 Manager đang quản lý (Branch.ManagerId = managerId). Ném 404 nếu Manager chưa được gán chi nhánh.</summary>
    /// <remarks>Gọi: IBranchRepository.GetByManagerIdAsync.</remarks>
    public async Task<BranchDto> GetByManagerAsync(Guid managerId, CancellationToken ct = default)
    {
        var branch = await branchRepo.GetByManagerIdAsync(managerId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.ManagerNotAssigned);
        return branch.ToDto();
    }

    /// <summary>Tạo chi nhánh mới. Mã chi nhánh (BranchCode) được sinh tự động theo thứ tự, duy nhất toàn hệ thống.</summary>
    /// <remarks>Gọi: IBranchRepository.GetNextBranchCodeAsync → AddAsync + SaveChangesAsync → GetByIdAsync (trả về).</remarks>
    public async Task<BranchDto> CreateAsync(CreateBranchRequest request, CancellationToken ct = default)
    {
        var branch = new Branch
        {
            BranchCode   = await branchRepo.GetNextBranchCodeAsync(ct),
            Name         = request.Name.Trim(),
            Address      = request.Address.Trim(),
            City         = request.City.Trim(),
            Phone        = request.Phone.Trim(),
            Email        = request.Email?.Trim(),
            Latitude     = request.Latitude,
            Longitude    = request.Longitude,
            OpenTime     = request.OpenTime,
            CloseTime    = request.CloseTime,
            IsActive     = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        await branchRepo.AddAsync(branch, ct);
        await branchRepo.SaveChangesAsync(ct);

        logger.LogInformation("Created branch {Code} ({Id})", branch.BranchCode, branch.BranchId);

        return (await branchRepo.GetByIdAsync(branch.BranchId, ct))!.ToDto();
    }

    /// <summary>Chỉ update field nào có giá trị trong request, null = giữ nguyên giá trị cũ.</summary>
    /// <remarks>Gọi: IBranchRepository.GetByIdAsync → SaveChangesAsync.</remarks>
    public async Task<BranchDto> UpdateAsync(Guid branchId, UpdateBranchRequest request, CancellationToken ct = default)
    {
        var branch = await branchRepo.GetByIdAsync(branchId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        if (request.Name is not null)    branch.Name    = request.Name.Trim();
        if (request.Address is not null) branch.Address = request.Address.Trim();
        if (request.City is not null)    branch.City    = request.City.Trim();
        if (request.Phone is not null)   branch.Phone   = request.Phone.Trim();
        if (request.Email is not null)   branch.Email   = request.Email.Trim();
        if (request.Latitude.HasValue)   branch.Latitude  = request.Latitude;
        if (request.Longitude.HasValue)  branch.Longitude = request.Longitude;
        if (request.OpenTime.HasValue)   branch.OpenTime  = request.OpenTime.Value;
        if (request.CloseTime.HasValue)  branch.CloseTime = request.CloseTime.Value;
        if (request.IsActive.HasValue)   branch.IsActive  = request.IsActive.Value;

        branch.UpdatedAtUtc = DateTime.UtcNow;
        await branchRepo.SaveChangesAsync(ct);

        logger.LogInformation("Updated branch {Id}", branchId);
        return branch.ToDto();
    }

    /// <summary>Ngừng hoạt động chi nhánh (soft delete: chỉ set IsActive=false, không xoá row để giữ lịch sử booking/slot).</summary>
    /// <remarks>Gọi: IBranchRepository.GetByIdAsync → SaveChangesAsync (soft delete, chỉ set IsActive=false).</remarks>
    public async Task DeleteAsync(Guid branchId, CancellationToken ct = default)
    {
        var branch = await branchRepo.GetByIdAsync(branchId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        branch.IsActive      = false;
        branch.UpdatedAtUtc  = DateTime.UtcNow;
        await branchRepo.SaveChangesAsync(ct);

        logger.LogInformation("Soft-deleted branch {Id}", branchId);
    }

    /// <summary>
    /// Gán bất kỳ user nào làm manager chi nhánh → tự động set role thành Manager.
    /// Admin không cần set role trước, service xử lý tự động.
    /// Block nếu user là Admin hoặc đang quản lý chi nhánh khác.
    /// </summary>
    /// <remarks>
    /// Gọi: IBranchRepository.GetByIdAsync + IsManagerAssignedAsync → IUserRepository.GetByIdAsync + UpdateAsync
    /// → IBranchRepository.SaveChangesAsync → GetByIdAsync (trả về).
    /// </remarks>
    public async Task<BranchDto> AssignManagerAsync(Guid branchId, Guid userId, CancellationToken ct = default)
    {
        var branch = await branchRepo.GetByIdAsync(branchId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        var user = await userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

        if (user.Role == UserRole.Admin)
            throw AppException.BadRequest(ValidationMessage.Branch.CannotAssignAdminAsManager);

        if (await branchRepo.IsManagerAssignedAsync(userId, excludeBranchId: branchId, ct))
            throw AppException.Conflict(ValidationMessage.Branch.ManagerAlreadyAssignedElsewhere);

        user.Role     = UserRole.Manager;
        user.BranchId = branchId;
        await userRepo.UpdateAsync(user);

        branch.ManagerId    = userId;
        branch.UpdatedAtUtc = DateTime.UtcNow;
        await branchRepo.SaveChangesAsync(ct);

        logger.LogInformation("Assigned user {UserId} as manager of branch {BranchId}", userId, branchId);
        return (await branchRepo.GetByIdAsync(branchId, ct))!.ToDto();
    }

    /// <summary>
    /// Gỡ manager khỏi chi nhánh → revert role về Customer.
    /// </summary>
    /// <remarks>
    /// Gọi: IBranchRepository.GetByIdAsync → IUserRepository.GetByIdAsync + UpdateAsync → IBranchRepository.SaveChangesAsync.
    /// </remarks>
    public async Task<BranchDto> RemoveManagerAsync(Guid branchId, CancellationToken ct = default)
    {
        var branch = await branchRepo.GetByIdAsync(branchId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        if (branch.ManagerId.HasValue)
        {
            var user = await userRepo.GetByIdAsync(branch.ManagerId.Value);
            if (user is not null)
            {
                user.Role     = UserRole.Customer;
                user.BranchId = null;
                await userRepo.UpdateAsync(user);
            }
        }

        branch.ManagerId    = null;
        branch.UpdatedAtUtc = DateTime.UtcNow;
        await branchRepo.SaveChangesAsync(ct);

        return branch.ToDto();
    }

    /// <summary>Danh sách nhân viên (Staff) thuộc 1 chi nhánh. Ném 404 nếu chi nhánh không tồn tại.</summary>
    /// <remarks>Gọi: IBranchRepository.GetByIdAsync + GetStaffAsync.</remarks>
    public async Task<List<BranchStaffDto>> GetStaffAsync(
        Guid branchId,
        Guid? managerId = null,
        CancellationToken ct = default)
    {
        await GetBranchForManagerScopeAsync(branchId, managerId, ct);

        var staff = await branchRepo.GetStaffAsync(branchId, ct);
        return staff.Select(u => u.ToStaffDto()).ToList();
    }

    /// <remarks>
    /// Gọi: IBranchRepository.GetByIdAsync → IUserRepository.GetByIdAsync + UpdateAsync (loop từng userId).
    /// </remarks>
    public async Task AssignStaffAsync(Guid branchId, List<Guid> userIds, CancellationToken ct = default)
    {
        if (await branchRepo.GetByIdAsync(branchId, ct) is null)
            throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        foreach (var userId in userIds.Distinct())
        {
            var user = await userRepo.GetByIdAsync(userId)
                ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFoundWithId(userId));

            if (user.Role != UserRole.Staff)
                throw AppException.BadRequest(ValidationMessage.Branch.UserNotStaff(user.FullName));

            if (user.BranchId == branchId)
                continue;

            if (user.BranchId.HasValue && user.BranchId != branchId)
                throw AppException.Conflict(ValidationMessage.Branch.StaffBelongsToOtherBranch(user.FullName));

            user.BranchId = branchId;
            await userRepo.UpdateAsync(user);
        }

        logger.LogInformation("Assigned {Count} staff to branch {BranchId}", userIds.Count, branchId);
    }

    /// <summary>Gỡ 1 nhân viên khỏi chi nhánh (đặt User.BranchId = null).</summary>
    /// <remarks>Gọi: IUserRepository.GetByIdAsync → UpdateAsync.</remarks>
    public async Task RemoveStaffAsync(Guid branchId, Guid userId, CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);

        if (user.Role != UserRole.Staff)
            throw AppException.BadRequest(ValidationMessage.Branch.NotStaffRole);

        if (user.BranchId != branchId)
            throw AppException.BadRequest(ValidationMessage.Branch.StaffNotInBranch);

        user.BranchId = null;
        await userRepo.UpdateAsync(user);
    }

    /// <summary>Danh sách dịch vụ mà 1 chi nhánh cung cấp (bảng BranchService). Đây là nguồn dữ liệu cho màn hình dịch vụ của Manager và cho khách khi đặt lịch tại chi nhánh.</summary>
    /// <remarks>Gọi: IBranchRepository.GetByIdAsync + GetServicesAsync.</remarks>
    public async Task<List<BranchServiceDto>> GetServicesAsync(Guid branchId, CancellationToken ct = default)
    {
        if (await branchRepo.GetByIdAsync(branchId, ct) is null)
            throw AppException.NotFound(ValidationMessage.Branch.NotFound);

        var list = await branchRepo.GetServicesAsync(branchId, ct);
        return list.Select(bs => bs.ToDto()).ToList();
    }

    /// <summary>
    /// Gán dịch vụ vào chi nhánh.
    /// Dịch vụ đã tồn tại → reactivate (IsActive=true). Chưa có → thêm mới vào BranchService.
    /// </summary>
    /// <remarks>
    /// Gọi: IBranchRepository.GetByIdAsync → GetBranchServiceAsync (loop từng serviceId) → AddBranchServicesAsync
    /// (bulk cho service mới) → SaveChangesAsync.
    /// </remarks>
    public async Task AssignServicesAsync(
        Guid branchId,
        List<Guid> serviceIds,
        Guid? managerId = null,
        CancellationToken ct = default)
    {
        await GetBranchForManagerScopeAsync(branchId, managerId, ct);

        var toAdd = new List<BranchServiceEntity>();
        foreach (var serviceId in serviceIds.Distinct())
        {
            var catalogItem = await serviceCatalogRepo.GetByIdAsync(serviceId)
                ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);
            if (catalogItem.ServiceNodeType == (byte)ServiceNodeType.Group)
                throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupCannotBeAssignedToBranch);
            if (!catalogItem.IsActive)
                throw AppException.BadRequest(ValidationMessage.ServicePricing.ServiceInactive);

            var pricingRules = await pricingRepo.GetForServiceAsync(serviceId, includeInactive: false, ct: ct);
            if (pricingRules.Count == 0)
                throw AppException.BadRequest(ValidationMessage.ServicePricing.NoActiveRule);

            var existing = await branchRepo.GetBranchServiceAsync(branchId, serviceId, ct);
            if (existing is not null)
            {
                existing.IsActive = true;
            }
            else
            {
                toAdd.Add(new BranchServiceEntity
                {
                    BranchId             = branchId,
                    ServiceCatalogItemId = serviceId,
                    IsActive             = true,
                    AddedAtUtc           = DateTime.UtcNow,
                });
            }
        }

        if (toAdd.Count > 0)
            await branchRepo.AddBranchServicesAsync(toAdd, ct);

        await branchRepo.SaveChangesAsync(ct);
        logger.LogInformation("Assigned {Count} services to branch {BranchId}", serviceIds.Count, branchId);
    }

    /// <summary>Bật/tắt 1 dịch vụ Ở CẤP CHI NHÁNH (BranchService.IsActive) — không đụng định nghĩa dịch vụ chung, nên chỉ ảnh hưởng chi nhánh này.</summary>
    /// <remarks>Gọi: IBranchRepository.GetBranchServiceAsync → SaveChangesAsync.</remarks>
    public async Task ToggleServiceAsync(
        Guid branchId,
        Guid serviceId,
        bool isActive,
        Guid? managerId = null,
        CancellationToken ct = default)
    {
        await GetBranchForManagerScopeAsync(branchId, managerId, ct);

        var bs = await branchRepo.GetBranchServiceAsync(branchId, serviceId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.ServiceNotAssigned);

        if (isActive)
        {
            var catalogItem = await serviceCatalogRepo.GetByIdAsync(serviceId)
                ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);
            if (!catalogItem.IsActive)
                throw AppException.BadRequest(ValidationMessage.ServicePricing.ServiceInactive);

            var pricingRules = await pricingRepo.GetForServiceAsync(serviceId, includeInactive: false, ct: ct);
            if (pricingRules.Count == 0)
                throw AppException.BadRequest(ValidationMessage.ServicePricing.NoActiveRule);
        }

        bs.IsActive = isActive;
        await branchRepo.SaveChangesAsync(ct);
    }

    /// <summary>Gỡ hẳn 1 dịch vụ khỏi chi nhánh (xoá row BranchService) — chi nhánh không còn cung cấp dịch vụ đó.</summary>
    /// <remarks>Gọi: IBranchRepository.GetBranchServiceAsync → RemoveBranchServiceAsync → SaveChangesAsync.</remarks>
    public async Task RemoveServiceAsync(Guid branchId, Guid serviceId, CancellationToken ct = default)
    {
        var bs = await branchRepo.GetBranchServiceAsync(branchId, serviceId, ct)
            ?? throw AppException.NotFound(ValidationMessage.Branch.ServiceNotAssigned);

        await branchRepo.RemoveBranchServiceAsync(bs, ct);
        await branchRepo.SaveChangesAsync(ct);
    }

}
