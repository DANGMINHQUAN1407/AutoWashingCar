using WashingCar_DAL.Entities;

namespace WashingCar_DAL.Interfaces;

public interface IBranchRepository
{
    Task<(List<Branch> Items, int TotalCount)> GetAllAsync(
        string? city, bool? isActive, int page, int pageSize, CancellationToken ct = default);

    Task<Branch?> GetByIdAsync(Guid branchId, CancellationToken ct = default);

    Task<Branch?> GetByCodeAsync(string branchCode, CancellationToken ct = default);
    Task<string> GetNextBranchCodeAsync(CancellationToken ct = default);
    Task<Branch?> GetByManagerIdAsync(Guid managerId, CancellationToken ct = default);

    Task<bool> IsManagerAssignedAsync(Guid managerId, Guid? excludeBranchId = null, CancellationToken ct = default);

    Task AddAsync(Branch branch, CancellationToken ct = default);

    Task<List<User>> GetStaffAsync(Guid branchId, CancellationToken ct = default);

    Task<List<BranchService>> GetServicesAsync(Guid branchId, CancellationToken ct = default);

    Task<BranchService?> GetBranchServiceAsync(Guid branchId, Guid serviceId, CancellationToken ct = default);

    Task AddBranchServiceAsync(BranchService branchService, CancellationToken ct = default);

    Task AddBranchServicesAsync(IEnumerable<BranchService> branchServices, CancellationToken ct = default);

    Task RemoveBranchServiceAsync(BranchService branchService, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
