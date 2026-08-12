using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Branch
{
    public Guid BranchId { get; set; }

    public string BranchCode { get; set; } = null!;

    public string Name { get; set; } = null!;

    public string Address { get; set; } = null!;

    public string City { get; set; } = null!;

    public string Phone { get; set; } = null!;

    public string? Email { get; set; }

    public decimal? Latitude { get; set; }

    public decimal? Longitude { get; set; }

    public TimeOnly OpenTime { get; set; }

    public TimeOnly CloseTime { get; set; }

    public Guid? ManagerId { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public DateTime? UpdatedAtUtc { get; set; }

    public virtual User? Manager { get; set; }

    public virtual ICollection<User> Staff { get; set; } = new List<User>();

    public virtual ICollection<BranchService> BranchServices { get; set; } = new List<BranchService>();

    public virtual ICollection<SlotInventory> SlotInventories { get; set; } = new List<SlotInventory>();

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<Voucher> Vouchers { get; set; } = new List<Voucher>();
}
