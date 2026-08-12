using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class Review
{
    public Guid ReviewId { get; set; }

    public Guid UserId { get; set; }

    public Guid BookingId { get; set; }

    public byte Rating { get; set; }

    public string? Comment { get; set; }

    public bool IsHidden { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public int ReviewType { get; set; }

    public Guid? StaffId { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual User User { get; set; } = null!;

    public virtual User? Staff { get; set; }
}
