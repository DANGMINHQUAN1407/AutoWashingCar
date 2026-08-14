using System;

namespace WashingCar_DAL.Entities;

public partial class VehicleImage
{
    public Guid VehicleImageId { get; set; }

    public Guid VehicleId { get; set; }

    public string ImageUrl { get; set; } = null!;

    public bool IsPrimary { get; set; }

    public int DisplayOrder { get; set; }

    public DateTime UploadedAtUtc { get; set; }

    public virtual Vehicle Vehicle { get; set; } = null!;
}
