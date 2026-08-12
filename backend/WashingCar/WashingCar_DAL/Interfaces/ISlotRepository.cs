using WashingCar_DAL.Entities;

namespace WashingCar_DAL.Interfaces;

public interface ISlotRepository
{
    Task<(List<SlotInventory> Items, int TotalCount)> GetPagedAsync(
        Guid branchId, DateOnly? fromDate, DateOnly? toDate,
        int page, int pageSize, CancellationToken ct = default);

    Task<SlotInventory?> GetByIdAsync(Guid slotId, CancellationToken ct = default);

    Task<List<SlotInventory>> GetAvailableAsync(Guid branchId, DateOnly date, CancellationToken ct = default);

    Task<bool> ExistsAsync(Guid branchId, DateOnly date, TimeOnly startTime, CancellationToken ct = default);

    Task<bool> HasBookingsAsync(Guid slotId, CancellationToken ct = default);

    Task AddAsync(SlotInventory slot, CancellationToken ct = default);

    Task AddRangeAsync(IEnumerable<SlotInventory> slots, CancellationToken ct = default);

    Task RemoveAsync(SlotInventory slot, CancellationToken ct = default);

    Task SaveChangesAsync(CancellationToken ct = default);
}
