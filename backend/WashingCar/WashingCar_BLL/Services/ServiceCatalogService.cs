using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_BLL.Services;

public class ServiceCatalogService : IServiceCatalogService
{
    private readonly IServiceCatalogRepository _repo;
    private readonly IBranchRepository _branchRepo;
    private readonly ILogger<ServiceCatalogService> _logger;

    public ServiceCatalogService(
        IServiceCatalogRepository repo,
        IBranchRepository branchRepo,
        ILogger<ServiceCatalogService> logger)
    {
        _repo = repo;
        _branchRepo = branchRepo;
        _logger = logger;
    }

    public async Task<PagedResult<ServiceCatalogDto>> GetAllPaginatedAsync(ServiceCatalogQuery query)
    {
        var (items, totalCount) = await _repo.GetAllPaginatedAsync(query);

        _logger.LogInformation(
            "Retrieved {Count}/{Total} service catalog items — page {Page}",
            items.Count, totalCount, query.Page);

        return new PagedResult<ServiceCatalogDto>
        {
            Items = items.Select(s => s.ToDto()).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<List<ServiceCatalogTreeDto>> GetTreeAsync(bool includeInactive = false)
    {
        var roots = await _repo.GetHierarchyAsync(includeInactive);
        return roots
            .Where(x => includeInactive || x.IsActive)
            .Select(x => x.ToTreeDto())
            .ToList();
    }

    public async Task<ServiceCatalogDto> GetByIdAsync(Guid id)
    {
        var item = await _repo.GetByIdAsync(id)
            ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);
        return item.ToDto();
    }

    public async Task<ServiceCatalogDto> CreateAsync(
        CreateServiceCatalogRequest request,
        Guid? currentUserId = null,
        bool isManager = false)
    {
        if (await _repo.ExistsNameAsync(request.ServiceName))
            throw AppException.Conflict(ValidationMessage.ServiceCatalog.NameExists);

        ValidateNodeFields(
            request.ServiceNodeType,
            request.SelectionMode,
            request.BasePrice,
            request.DurationMinutes);
        await ValidateParentAsync(request.ParentServiceCatalogItemId, request.ServiceNodeType, null);

        var item = new ServiceCatalogItem
        {
            ServiceName = request.ServiceName.Trim(),
            Description = request.Description,
            BasePrice = request.BasePrice,
            DurationMinutes = request.DurationMinutes,
            ServicePackageType = request.ServicePackageType,
            ServiceNodeType = request.ServiceNodeType,
            ParentServiceCatalogItemId = request.ParentServiceCatalogItemId,
            SelectionMode = request.ServiceNodeType == (byte)ServiceNodeType.Group
                ? request.SelectionMode
                : null,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        var created = await _repo.CreateAsync(item);

        // Chỉ leaf là dịch vụ thực hiện tại branch. Group là node tổ chức, không gán trực tiếp.
        if (isManager && currentUserId.HasValue && IsLeaf(created))
        {
            var branch = await _branchRepo.GetByManagerIdAsync(currentUserId.Value);
            if (branch != null)
            {
                var branchService = new WashingCar_DAL.Entities.BranchService
                {
                    BranchId = branch.BranchId,
                    ServiceCatalogItemId = created.ServiceCatalogItemId,
                    IsActive = true,
                    AddedAtUtc = DateTime.UtcNow,
                };
                await _branchRepo.AddBranchServiceAsync(branchService);
                await _branchRepo.SaveChangesAsync();
                _logger.LogInformation(
                    "Auto-assigned leaf service {ServiceId} to branch {BranchId} managed by {ManagerId}",
                    created.ServiceCatalogItemId, branch.BranchId, currentUserId.Value);
            }
        }

        _logger.LogInformation(
            "Created service catalog item {Id} node type {NodeType}",
            created.ServiceCatalogItemId, created.ServiceNodeType);
        return created.ToDto();
    }

    public async Task<ServiceCatalogDto> UpdateAsync(Guid id, UpdateServiceCatalogRequest request)
    {
        var item = await _repo.GetByIdAsync(id)
            ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);

        if (await _repo.ExistsNameAsync(request.ServiceName, excludeId: id))
            throw AppException.Conflict(ValidationMessage.ServiceCatalog.NameExists);

        var hierarchyFieldsProvided = request.ServiceNodeType.HasValue
            || request.SelectionMode.HasValue
            || request.ParentServiceCatalogItemId.HasValue;
        var nodeType = request.ServiceNodeType ?? item.ServiceNodeType;
        var parentId = hierarchyFieldsProvided
            ? request.ParentServiceCatalogItemId
            : item.ParentServiceCatalogItemId;
        var selectionMode = request.SelectionMode
            ?? (nodeType == (byte)ServiceNodeType.Group ? item.SelectionMode : null);

        ValidateNodeFields(nodeType, selectionMode, request.BasePrice, request.DurationMinutes);
        await ValidateParentAsync(parentId, nodeType, id);

        if (item.ServiceNodeType == (byte)ServiceNodeType.Group
            && nodeType == (byte)ServiceNodeType.Leaf
            && await _repo.HasChildrenAsync(id))
        {
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupWithChildrenCannotBecomeLeaf);
        }

        item.ServiceName = request.ServiceName.Trim();
        item.Description = request.Description;
        item.BasePrice = request.BasePrice;
        item.DurationMinutes = request.DurationMinutes;
        item.ServicePackageType = request.ServicePackageType ?? item.ServicePackageType;
        item.ServiceNodeType = nodeType;
        item.ParentServiceCatalogItemId = parentId;
        item.SelectionMode = nodeType == (byte)ServiceNodeType.Group ? selectionMode : null;

        await _repo.UpdateAsync(item);
        _logger.LogInformation("Updated service catalog item {Id}", id);
        return item.ToDto();
    }

    public async Task SetActiveAsync(Guid id, bool isActive)
    {
        var item = await _repo.GetByIdAsync(id)
            ?? throw AppException.NotFound(ValidationMessage.ServiceCatalog.NotFound);

        if (item.IsActive == isActive) return;

        if (!isActive
            && item.ServiceNodeType == (byte)ServiceNodeType.Group
            && await _repo.HasChildrenAsync(id, activeOnly: true))
        {
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.ActiveChildrenPreventGroupDeactivation);
        }

        item.IsActive = isActive;
        await _repo.UpdateAsync(item);
        _logger.LogInformation("Service {Id} IsActive={IsActive}", id, isActive);
    }

    private async Task ValidateParentAsync(Guid? parentId, byte nodeType, Guid? currentId)
    {
        if (nodeType == (byte)ServiceNodeType.Group)
        {
            if (parentId.HasValue)
                throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupCannotHaveParent);
            return;
        }

        if (!parentId.HasValue) return;
        if (currentId.HasValue && parentId.Value == currentId.Value)
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.HierarchyCycle);

        var parent = await _repo.GetByIdAsync(parentId.Value);
        if (parent == null || !parent.IsActive)
            throw AppException.NotFound(ValidationMessage.ServiceCatalog.ParentNotFound);
        if (parent.ServiceNodeType != (byte)ServiceNodeType.Group)
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.ParentMustBeGroup);
    }

    private static void ValidateNodeFields(
        byte nodeType,
        byte? selectionMode,
        decimal basePrice,
        short durationMinutes)
    {
        if (!Enum.IsDefined(typeof(ServiceNodeType), nodeType))
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.InvalidNodeType);

        if (nodeType == (byte)ServiceNodeType.Group)
        {
            if (selectionMode != (byte)ServiceSelectionMode.AllChildren)
                throw AppException.BadRequest(ValidationMessage.ServiceCatalog.InvalidSelectionMode);
            if (basePrice != 0 || durationMinutes != 0)
                throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupCannotBeBooked);
            return;
        }

        if (selectionMode.HasValue)
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.InvalidSelectionMode);
        if (basePrice <= 0 || durationMinutes <= 0)
            throw AppException.BadRequest(ValidationMessage.ServiceCatalog.GroupCannotBeBooked);
    }

    private static bool IsLeaf(ServiceCatalogItem item)
        => item.ServiceNodeType == (byte)ServiceNodeType.Leaf;
}
