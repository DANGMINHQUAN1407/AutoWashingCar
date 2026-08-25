using Microsoft.EntityFrameworkCore;
using WashingCar_Common.Enum;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Common;

namespace WashingCar_DAL.Repositories;

public class BranchRepository(WashingCarDbContext db) : IBranchRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<(List<Branch> Items, int TotalCount)> GetAllAsync(
        string? city, bool? isActive, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _db.Branches
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(city))
            q = q.Where(b => b.City.Contains(city));

        if (isActive.HasValue)
            q = q.Where(b => b.IsActive == isActive.Value);

        var total = await q.CountAsync(ct);

        var items = await q
            .OrderBy(b => b.City)
            .ThenBy(b => b.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Include(b => b.Manager)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<Branch?> GetByIdAsync(Guid branchId, CancellationToken ct = default)
        => await _db.Branches
            .Include(b => b.Manager)
            .FirstOrDefaultAsync(b => b.BranchId == branchId, ct);

    public async Task<Branch?> GetByCodeAsync(string branchCode, CancellationToken ct = default)
        => await _db.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.BranchCode == branchCode, ct);

    public async Task<Branch?> GetByManagerIdAsync(Guid managerId, CancellationToken ct = default)
        => await _db.Branches
            .Include(b => b.Manager)
            .FirstOrDefaultAsync(b => b.ManagerId == managerId, ct);

    public async Task<bool> IsManagerAssignedAsync(Guid managerId, Guid? excludeBranchId = null, CancellationToken ct = default)
        => await _db.Branches
            .AnyAsync(b => b.ManagerId == managerId
                        && (excludeBranchId == null || b.BranchId != excludeBranchId.Value), ct);

    public async Task<string> GetNextBranchCodeAsync(CancellationToken ct = default)
    {
        var codes = await _db.Branches
            .Where(b => b.BranchCode.StartsWith("BR-"))
            .Select(b => b.BranchCode)
            .ToListAsync(ct);

        var maxNum = codes
            .Select(c => int.TryParse(c[3..], out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();

        return $"BR-{maxNum + 1:D3}";
    }

    public async Task AddAsync(Branch branch, CancellationToken ct = default)
        => await _db.Branches.AddAsync(branch, ct);

    public async Task<(List<User> Items, int TotalCount)> GetStaffAsync(
        Guid branchId, PaginationQuery query, CancellationToken ct = default)
    {
        var staff = _db.Users
            .AsNoTracking()
            .Where(u => u.BranchId == branchId && u.Role == UserRole.Staff && !u.IsDeleted);

        var totalCount = await staff.CountAsync(ct);
        var items = await staff
            .OrderBy(u => u.FullName)
            .ThenBy(u => u.UserId)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<(List<BranchService> Items, int TotalCount)> GetServicesAsync(
        Guid branchId, PaginationQuery query, CancellationToken ct = default)
    {
        var services = _db.BranchServices
            .AsNoTracking()
            .Where(bs => bs.BranchId == branchId);

        var totalCount = await services.CountAsync(ct);
        var items = await services
            .Include(bs => bs.ServiceCatalogItem)
            .OrderBy(bs => bs.ServiceCatalogItem.ServiceName)
            .ThenBy(bs => bs.ServiceCatalogItemId)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public async Task<BranchService?> GetBranchServiceAsync(Guid branchId, Guid serviceId, CancellationToken ct = default)
        => await _db.BranchServices
            .FirstOrDefaultAsync(bs => bs.BranchId == branchId && bs.ServiceCatalogItemId == serviceId, ct);

    public async Task AddBranchServiceAsync(BranchService branchService, CancellationToken ct = default)
        => await _db.BranchServices.AddAsync(branchService, ct);

    public async Task AddBranchServicesAsync(IEnumerable<BranchService> branchServices, CancellationToken ct = default)
        => await _db.BranchServices.AddRangeAsync(branchServices, ct);

    public void RemoveBranchService(BranchService branchService)
        => _db.BranchServices.Remove(branchService);

    Task IBranchRepository.RemoveBranchServiceAsync(BranchService branchService, CancellationToken ct)
    {
        _db.BranchServices.Remove(branchService);
        return Task.CompletedTask;
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
        => await _db.SaveChangesAsync(ct);
}
