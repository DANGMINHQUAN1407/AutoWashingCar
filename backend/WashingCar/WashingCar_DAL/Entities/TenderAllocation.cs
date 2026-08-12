using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class TenderAllocation
{
    public Guid TenderAllocationId { get; set; }

    public Guid PaymentId { get; set; }

    public byte TenderType { get; set; }

    public decimal Amount { get; set; }

    public virtual Payment Payment { get; set; } = null!;
}
