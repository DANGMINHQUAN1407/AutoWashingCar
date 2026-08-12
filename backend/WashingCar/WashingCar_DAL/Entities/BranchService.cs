using System;

namespace WashingCar_DAL.Entities;

public partial class BranchService
{
    public Guid BranchId { get; set; }

    public Guid ServiceCatalogItemId { get; set; }

    public bool IsActive { get; set; }

    public DateTime AddedAtUtc { get; set; }

    public virtual Branch Branch { get; set; } = null!;

    public virtual ServiceCatalogItem ServiceCatalogItem { get; set; } = null!;
}
