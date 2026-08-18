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

    /// <summary>1=Standard, 2=AddOn, 3=Premium.</summary>
    public byte ServicePackageType { get; set; } = (byte)WashingCar_Common.Enum.ServicePackageType.Standard;

    /// <summary>1=Group, 2=Leaf. Only Leaf items can be booked and billed.</summary>
    public byte ServiceNodeType { get; set; } = (byte)WashingCar_Common.Enum.ServiceNodeType.Leaf;

    /// <summary>Null means root item. A non-null value points to the parent group.</summary>
    public Guid? ParentServiceCatalogItemId { get; set; }

    /// <summary>How a parent group selects its children. Currently only AllChildren is supported.</summary>
    public byte? SelectionMode { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual ServiceCatalogItem? ParentServiceCatalogItem { get; set; }

    public virtual ICollection<ServiceCatalogItem> ChildServiceCatalogItems { get; set; } = new List<ServiceCatalogItem>();

    public virtual ICollection<BranchService> BranchServices { get; set; } = new List<BranchService>();

    public virtual ICollection<BookingLine> BookingLines { get; set; } = new List<BookingLine>();
}
