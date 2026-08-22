using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public class VehicleBrandCatalog
{
    public Guid VehicleBrandCatalogId { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; }
    public byte VehicleType { get; set; }
    public bool IsLuxury { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<Vehicle> Vehicles { get; set; } = new List<Vehicle>();
}
