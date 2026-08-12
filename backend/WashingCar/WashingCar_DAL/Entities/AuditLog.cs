using System;
using System.Collections.Generic;

namespace WashingCar_DAL.Entities;

public partial class AuditLog
{
    public Guid AuditLogId { get; set; }

    public Guid? UserId { get; set; }

    public string Action { get; set; } = null!;

    public string TableName { get; set; } = null!;

    public Guid RecordId { get; set; }

    public string? OldValues { get; set; }

    public string? NewValues { get; set; }

    public DateTime CreatedAtUtc { get; set; }

    public virtual User? User { get; set; }
}
