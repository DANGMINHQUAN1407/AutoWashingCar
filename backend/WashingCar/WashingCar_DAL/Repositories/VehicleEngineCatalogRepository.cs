using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_DAL.Repositories;

public class VehicleEngineCatalogRepository(WashingCarDbContext db) : IVehicleEngineCatalogRepository
{
    private readonly WashingCarDbContext _db = db;

    public async Task<(List<VehicleEngineCatalog> Items, int TotalCount)> GetAllPaginatedAsync(VehicleCatalogQuery query)
    {
        var q = _db.VehicleEngineCatalogs.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            q = q.Where(x => EF.Functions.Like(x.Code, $"%{search}%") ||
                             EF.Functions.Like(x.Name, $"%{search}%"));
        }

        if (query.IsActive.HasValue)
            q = q.Where(x => x.IsActive == query.IsActive.Value);

        var totalCount = await q.CountAsync();
        q = query.SortBy?.ToLowerInvariant() switch
        {
            "code" => query.SortDesc ? q.OrderByDescending(x => x.Code) : q.OrderBy(x => x.Code),
            "name" => query.SortDesc ? q.OrderByDescending(x => x.Name) : q.OrderBy(x => x.Name),
            _ => query.SortDesc ? q.OrderByDescending(x => x.CreatedAtUtc) : q.OrderBy(x => x.CreatedAtUtc),
        };

        var items = await q.Skip(query.Skip).Take(query.PageSize).ToListAsync();
        return (items, totalCount);
    }

    public Task<VehicleEngineCatalog?> GetByIdAsync(Guid id)
        => _db.VehicleEngineCatalogs.FirstOrDefaultAsync(x => x.VehicleEngineCatalogId == id);

    public Task<bool> ExistsCodeAsync(string code, Guid? excludeId = null)
    {
        var normalized = code.Trim().ToUpper();
        return _db.VehicleEngineCatalogs.AnyAsync(x => x.Code.ToUpper() == normalized &&
            (excludeId == null || x.VehicleEngineCatalogId != excludeId.Value));
    }

    public Task<bool> ExistsNameAsync(string name, Guid? excludeId = null)
    {
        var normalized = name.Trim().ToUpper();
        return _db.VehicleEngineCatalogs.AnyAsync(x => x.Name.ToUpper() == normalized &&
            (excludeId == null || x.VehicleEngineCatalogId != excludeId.Value));
    }

    public async Task<VehicleEngineCatalog> CreateAsync(VehicleEngineCatalog item)
    {
        await _db.VehicleEngineCatalogs.AddAsync(item);
        await _db.SaveChangesAsync();
        return item;
    }

    public async Task UpdateAsync(VehicleEngineCatalog item)
    {
        _db.VehicleEngineCatalogs.Update(item);
        await _db.SaveChangesAsync();
    }
}
