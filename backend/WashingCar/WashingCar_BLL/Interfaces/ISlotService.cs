using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Slot;

namespace WashingCar_BLL.Interfaces;

public interface ISlotService
{
    Task<PagedResult<SlotDto>> GetPagedAsync(Guid branchId, SlotQuery query, CancellationToken ct = default);

    Task<SlotDto> GetByIdAsync(Guid slotId, CancellationToken ct = default);

    Task<List<SlotDto>> GetAvailableAsync(Guid branchId, DateOnly date, CancellationToken ct = default);

    Task<SlotDto> CreateAsync(Guid branchId, CreateSlotRequest request, CancellationToken ct = default);

    Task<int> GenerateAsync(Guid branchId, GenerateSlotsRequest request, CancellationToken ct = default);

    Task<SlotDto> UpdateAsync(Guid slotId, UpdateSlotRequest request, CancellationToken ct = default);

    Task DeleteAsync(Guid slotId, CancellationToken ct = default);
}
