using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;

namespace WashingCar_DAL.Repositories;

public class SlotRepository : ISlotRepository
{
    private readonly WashingCarDbContext _db;

    public SlotRepository(WashingCarDbContext db)
    {
        _db = db;
    }

    public async Task AddAsync(SlotInventory slot, CancellationToken ct = default)
    {
        await _db.SlotInventories.AddAsync(slot, ct);
    }

    public async Task AddRangeAsync(IEnumerable<SlotInventory> slots, CancellationToken ct = default)
    {
        await _db.SlotInventories.AddRangeAsync(slots, ct);
    }

    public async Task<bool> ExistsAsync(Guid branchId, DateOnly date, TimeOnly startTime, CancellationToken ct = default)
    {
        return await _db.SlotInventories.AnyAsync(s => s.BranchId == branchId
                                                        && s.SlotDate == date
                                                        && s.SlotStartTime == startTime, ct);
    }

    public async Task<List<SlotInventory>> GetAvailableAsync(Guid branchId, DateOnly date, CancellationToken ct = default)
    {
        return await _db.SlotInventories.AsNoTracking()
        .Where(s => s.BranchId == branchId && s.SlotDate == date)
        .OrderBy(s => s.SlotStartTime)
        .ToListAsync(ct);
    }

    public async Task<SlotInventory?> GetByIdAsync(Guid slotId, CancellationToken ct = default)
    {
        return await _db.SlotInventories.FirstOrDefaultAsync(s => s.SlotInventoryId == slotId, ct);
    }

    public Task RemoveAsync(SlotInventory slot, CancellationToken ct = default)
    {
        _db.SlotInventories.Remove(slot);
        return Task.CompletedTask;
    }

    public async Task<(List<SlotInventory> Items, int TotalCount)> GetPagedAsync(Guid branchId, DateOnly? fromDate, DateOnly? toDate, int page, int pageSize, CancellationToken ct = default)
    {
        var q = _db.SlotInventories
        .AsNoTracking()
        .Where(s => s.BranchId == branchId);

        if (fromDate.HasValue)
        {
            q = q.Where(s => s.SlotDate >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            q = q.Where(s => s.SlotDate <= toDate.Value);
        }

        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(s => s.SlotDate)
                           .ThenBy(s => s.SlotStartTime)
                           .Skip((page - 1) * pageSize)
                           .Take(pageSize)
                           .ToListAsync(ct);

        return (items, total);
    }

    public async Task<bool> HasBookingsAsync(Guid slotId, CancellationToken ct = default)
    {
        return await _db.Bookings.AnyAsync(b => b.SlotInventoryId == slotId, ct);
    }

    public async Task SaveChangesAsync(CancellationToken ct = default)
    {
        await _db.SaveChangesAsync(ct);
    }

}
