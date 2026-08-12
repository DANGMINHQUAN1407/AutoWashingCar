using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class ServiceCatalogItem
{
    public Guid ServiceCatalogItemId { get; set; }

    public string ServiceName { get; set; } = null!;

    public string? Description { get; set; }

    public decimal BasePrice { get; set; }

    public short DurationMinutes { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual ICollection<BranchService> BranchServices { get; set; } = new List<BranchService>();

    public virtual ICollection<BookingLine> BookingLines { get; set; } = new List<BookingLine>();
}
