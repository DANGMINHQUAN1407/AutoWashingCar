using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Vehicle
{
    public Guid VehicleId { get; set; }

    public Guid UserId { get; set; }

    public string LicensePlate { get; set; } = null!;

    public byte VehicleType { get; set; }

    public string? Brand { get; set; }

    public string? Model { get; set; }

    public int? ManufactureYear { get; set; }

    public byte? EngineType { get; set; }

    public byte? BodyStyle { get; set; }

    public Guid? EngineCatalogId { get; set; }

    public Guid? BodyStyleCatalogId { get; set; }

    public Guid? BrandCatalogId { get; set; }

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public Guid? DeletedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual ICollection<VehicleImage> VehicleImages { get; set; } = new List<VehicleImage>();

    public virtual ICollection<VehicleTransferRequest> VehicleTransferRequests { get; set; } = new List<VehicleTransferRequest>();

    public virtual ICollection<VehicleOwnershipHistory> OwnershipHistories { get; set; } = new List<VehicleOwnershipHistory>();

    public virtual User? DeletedByUser { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual VehicleEngineCatalog? EngineCatalog { get; set; }

    public virtual VehicleBodyStyleCatalog? BodyStyleCatalog { get; set; }

    public virtual VehicleBrandCatalog? BrandCatalog { get; set; }
}
