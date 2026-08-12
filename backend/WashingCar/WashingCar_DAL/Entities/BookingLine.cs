using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class BookingLine
{
    public Guid BookingLineId { get; set; }

    public Guid BookingId { get; set; }

    public Guid ServiceCatalogItemId { get; set; }

    public string ServiceName { get; set; } = null!;

    public decimal UnitPrice { get; set; }

    public short DurationMinutes { get; set; }

    public short Quantity { get; set; }

    public decimal LineTotal { get; set; }

    public virtual Booking Booking { get; set; } = null!;

    public virtual ServiceCatalogItem ServiceCatalogItem { get; set; } = null!;
}
