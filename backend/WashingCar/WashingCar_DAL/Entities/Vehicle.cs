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

    public bool IsDeleted { get; set; }

    public DateTime? DeletedAtUtc { get; set; }

    public Guid? DeletedByUserId { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public byte[] RowVersion { get; set; } = null!;

    public virtual ICollection<Booking> Bookings { get; set; } = new List<Booking>();

    public virtual User? DeletedByUser { get; set; }

    public virtual User User { get; set; } = null!;
}
