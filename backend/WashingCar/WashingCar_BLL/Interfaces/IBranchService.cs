using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Common;
using WashingCar_Domain.DTOs.Branch;

namespace WashingCar_BLL.Interfaces;

public interface IBranchService
{
    Task<PagedResult<BranchDto>> GetAllAsync(BranchQuery query, CancellationToken ct = default);
    Task<BranchDto>              GetByIdAsync(Guid branchId, CancellationToken ct = default);
    Task<BranchDto>              GetByManagerAsync(Guid managerId, CancellationToken ct = default);
    Task<BranchDto>              CreateAsync(CreateBranchRequest request, CancellationToken ct = default);
    Task<BranchDto>              UpdateAsync(Guid branchId, UpdateBranchRequest request, CancellationToken ct = default);
    Task                         DeleteAsync(Guid branchId, CancellationToken ct = default);

    Task<BranchDto>              AssignManagerAsync(Guid branchId, Guid managerId, CancellationToken ct = default);
    Task<BranchDto>              RemoveManagerAsync(Guid branchId, CancellationToken ct = default);

    Task<PagedResult<BranchStaffDto>> GetStaffAsync(
        Guid branchId,
        PaginationQuery query,
        Guid? managerId = null,
        CancellationToken ct = default);

    Task AssignStaffAsync(
        Guid branchId,
        List<Guid> userIds,
        CancellationToken ct = default);

    Task RemoveStaffAsync(
        Guid branchId,
        Guid userId,
        CancellationToken ct = default);

    Task<PagedResult<BranchServiceDto>> GetServicesAsync(
        Guid branchId,
        PaginationQuery query,
        CancellationToken ct = default);

    Task AssignServicesAsync(
        Guid branchId,
        List<Guid> serviceIds,
        Guid? managerId = null,
        CancellationToken ct = default);

    Task ToggleServiceAsync(
        Guid branchId,
        Guid serviceId,
        bool isActive,
        Guid? managerId = null,
        CancellationToken ct = default);

    Task RemoveServiceAsync(
        Guid branchId,
        Guid serviceId,
        CancellationToken ct = default);
}
