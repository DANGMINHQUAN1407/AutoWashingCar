using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class SlotInventory
{
    public Guid SlotInventoryId { get; set; }

    public Guid BranchId { get; set; }

    public DateOnly SlotDate { get; set; }

    public TimeOnly SlotStartTime { get; set; }

    public TimeOnly SlotEndTime { get; set; }

    public short Capacity { get; set; }

    public short OnlineReservedCount { get; set; }

    public short WalkInReservedCount { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual Branch Branch { get; set; } = null!;

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}
