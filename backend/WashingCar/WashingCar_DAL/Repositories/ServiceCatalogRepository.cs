using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_Common.Enum;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_DAL.Repositories;

public class ServiceCatalogRepository(WashingCarDbContext db) : IServiceCatalogRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<(List<ServiceCatalogItem> Items, int TotalCount)> GetAllPaginatedAsync(ServiceCatalogQuery query)
    {
        var q = _db.ServiceCatalogItems.AsNoTracking();

        if (query.VehicleType.HasValue)
        {
            q = q
                .Include(x => x.ServiceVehiclePricings)
                .ThenInclude(p => p.EngineCatalog);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim();
            q = q.Where(x => x.ServiceName.Contains(s, StringComparison.OrdinalIgnoreCase) ||
                              (x.Description != null && x.Description.Contains(s, StringComparison.OrdinalIgnoreCase)));
        }

        if (query.IsActive.HasValue)
            q = q.Where(x => x.IsActive == query.IsActive.Value);

        if (query.BranchId.HasValue)
        {
            q = q.Where(x => x.BranchServices.Any(bs =>
                bs.BranchId == query.BranchId.Value && bs.IsActive));
        }

        if (query.VehicleType.HasValue)
        {
            var vehicleType = (byte)query.VehicleType.Value;
            q = q.Where(x =>
                x.ServiceNodeType == (byte)ServiceNodeType.Leaf
                && x.ServiceVehiclePricings.Any(p =>
                    p.IsActive
                    && (byte)p.VehicleType == vehicleType
                    && (query.EngineCatalogId == null
                        || p.EngineCatalogId == null
                        || (p.EngineCatalogId == query.EngineCatalogId && p.EngineCatalog!.IsActive))));
        }

        var totalCount = await q.CountAsync();

        q = query.SortBy?.ToLower() switch
        {
            "servicename"     => query.SortDesc ? q.OrderByDescending(x => x.ServiceName)     : q.OrderBy(x => x.ServiceName),
            "baseprice"       => query.SortDesc ? q.OrderByDescending(x => x.BasePrice)       : q.OrderBy(x => x.BasePrice),
            "durationminutes" => query.SortDesc ? q.OrderByDescending(x => x.DurationMinutes) : q.OrderBy(x => x.DurationMinutes),
            _                 => query.SortDesc ? q.OrderByDescending(x => x.CreatedAtUtc)    : q.OrderBy(x => x.CreatedAtUtc),
        };

        var items = await q.Skip(query.Skip).Take(query.PageSize).ToListAsync();
        return (items, totalCount);
    }

    public async Task<List<ServiceCatalogItem>> GetHierarchyAsync(bool includeInactive = false)
    {
        var query = _db.ServiceCatalogItems
            .AsNoTracking()
            .Include(x => x.ChildServiceCatalogItems)
            .AsQueryable();

        if (!includeInactive)
        {
            query = query
                .Where(x => x.IsActive)
                .Select(x => x);
        }

        return await query
            .Where(x => x.ParentServiceCatalogItemId == null)
            .OrderBy(x => x.ServiceName)
            .ToListAsync();
    }

    public async Task<ServiceCatalogItem?> GetByIdAsync(Guid id)
        => await _db.ServiceCatalogItems.FirstOrDefaultAsync(s => s.ServiceCatalogItemId == id);

    public async Task<List<ServiceCatalogItem>> GetChildrenAsync(Guid parentId, bool includeInactive = false)
        => await _db.ServiceCatalogItems
            .Where(s => s.ParentServiceCatalogItemId == parentId
                     && (includeInactive || s.IsActive))
            .OrderBy(s => s.ServiceName)
            .ToListAsync();

    public async Task<bool> ExistsNameAsync(string name, Guid? excludeId = null)
        => await _db.ServiceCatalogItems
            .AnyAsync(s => s.ServiceName.ToUpper() == name.ToUpper()
                        && (excludeId == null || s.ServiceCatalogItemId != excludeId.Value));

    public async Task<bool> HasChildrenAsync(Guid parentId, bool activeOnly = false)
        => await _db.ServiceCatalogItems
            .AnyAsync(x => x.ParentServiceCatalogItemId == parentId
                        && (!activeOnly || x.IsActive));

    public async Task<ServiceCatalogItem> CreateAsync(ServiceCatalogItem item)
    {
        await _db.ServiceCatalogItems.AddAsync(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task UpdateAsync(ServiceCatalogItem item)
    {
        _db.ServiceCatalogItems.Update(item);
        await _db.SaveChangesAsync();
    }
}
