using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Slot;

namespace WashingCar_BLL.Mappers;

public static class SlotMapper
{
    public static SlotDto ToDto(this SlotInventory slot) => new()
    {
        SlotInventoryId     = slot.SlotInventoryId,
        BranchId            = slot.BranchId,
        SlotDate            = slot.SlotDate,
        SlotStartTime       = slot.SlotStartTime,
        SlotEndTime         = slot.SlotEndTime,
        Capacity            = slot.Capacity,
        OnlineReservedCount = slot.OnlineReservedCount,
        WalkInReservedCount = slot.WalkInReservedCount,
        AvailableCount      = (short)(slot.Capacity - slot.OnlineReservedCount - slot.WalkInReservedCount),
        CreatedAtUtc        = slot.CreatedAtUtc,
    };
}
