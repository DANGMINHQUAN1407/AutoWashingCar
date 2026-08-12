using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.Logging;
using WashingCar_Common.Constant;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;

namespace WashingCar_DAL.Data;

/// <summary>
/// Tự động ghi mọi thay đổi dữ liệu vào bảng AuditLog (Action, TableName, RecordId, OldValues, NewValues, người thao tác).
/// Chạy 2 pha: gom thay đổi trước khi lưu, ghi log sau khi lưu để lấy được khoá chính do DB sinh (newsequentialid).
/// Lỗi ghi log không làm hỏng nghiệp vụ chính — chỉ log cảnh báo (best-effort).
/// </summary>
public class AuditSaveChangesInterceptor(
    ICurrentUserAccessor currentUser,
    ILogger<AuditSaveChangesInterceptor> logger) : SaveChangesInterceptor
{
    // Không ghi log 2 bảng này: AuditLog (tránh đệ quy), RefreshToken (token bảo mật, thay đổi liên tục).
    private static readonly HashSet<string> ExcludedEntities = new()
    {
        nameof(AuditLog),
        nameof(RefreshToken),
    };

    // Cột nhạy cảm hoặc không mang ý nghĩa nghiệp vụ — không lưu giá trị.
    private static readonly HashSet<string> ExcludedProperties = new()
    {
        "PasswordHash",
        "RowVersion",
    };

    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private readonly List<PendingAudit> _pending = new();
    private bool _isWritingAudit;

    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken cancellationToken = default)
    {
        if (!_isWritingAudit && eventData.Context is not null)
            Collect(eventData.Context);

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }

    public override async ValueTask<int> SavedChangesAsync(
        SaveChangesCompletedEventData eventData, int result, CancellationToken cancellationToken = default)
    {
        if (!_isWritingAudit && _pending.Count > 0 && eventData.Context is not null)
        {
            var logs = BuildLogs();
            _pending.Clear();

            if (logs.Count > 0)
            {
                _isWritingAudit = true;
                try
                {
                    eventData.Context.Set<AuditLog>().AddRange(logs);
                    await eventData.Context.SaveChangesAsync(cancellationToken);
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Ghi AuditLog thất bại ({Count} bản ghi)", logs.Count);
                }
                finally
                {
                    _isWritingAudit = false;
                }
            }
        }

        return await base.SavedChangesAsync(eventData, result, cancellationToken);
    }

    public override void SaveChangesFailed(DbContextErrorEventData eventData)
    {
        _pending.Clear();
        base.SaveChangesFailed(eventData);
    }

    public override Task SaveChangesFailedAsync(
        DbContextErrorEventData eventData, CancellationToken cancellationToken = default)
    {
        _pending.Clear();
        return base.SaveChangesFailedAsync(eventData, cancellationToken);
    }

    // ─── Pha 1: gom thay đổi trước khi lưu ───────────────────────────────────
    private void Collect(DbContext context)
    {
        foreach (var entry in context.ChangeTracker.Entries())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted))
                continue;

            if (ExcludedEntities.Contains(entry.Metadata.ClrType.Name))
                continue;

            var tableName = entry.Metadata.GetTableName() ?? entry.Metadata.ClrType.Name;

            switch (entry.State)
            {
                // Khoá chính do DB sinh nên hoãn lấy RecordId + NewValues sang pha 2.
                case EntityState.Added:
                    _pending.Add(new PendingAudit(AuditAction.Create, tableName, entry));
                    break;

                case EntityState.Modified:
                    var (oldValues, newValues) = DiffModified(entry);
                    if (oldValues.Count == 0)
                        break;   // không có cột nghiệp vụ nào đổi thật sự
                    _pending.Add(new PendingAudit(AuditAction.Update, tableName, entry)
                    {
                        RecordId   = ResolveKey(entry),
                        OldValues  = Serialize(oldValues),
                        NewValues  = Serialize(newValues),
                    });
                    break;

                // Sau khi lưu, entry bị detach nên phải chụp giá trị ngay bây giờ.
                case EntityState.Deleted:
                    _pending.Add(new PendingAudit(AuditAction.Delete, tableName, entry)
                    {
                        RecordId  = ResolveKey(entry),
                        OldValues = Serialize(Snapshot(entry, useCurrentValue: false)),
                    });
                    break;
            }
        }
    }

    // ─── Pha 2: dựng bản ghi AuditLog sau khi lưu ────────────────────────────
    private List<AuditLog> BuildLogs()
    {
        var userId = currentUser.UserId;
        var now    = DateTime.UtcNow;
        var logs   = new List<AuditLog>();

        foreach (var pending in _pending)
        {
            // Bản ghi mới: giờ khoá chính đã có giá trị thật từ DB.
            if (pending.Action == AuditAction.Create)
            {
                pending.RecordId  = ResolveKey(pending.Entry);
                pending.NewValues = Serialize(Snapshot(pending.Entry, useCurrentValue: true));
            }

            logs.Add(new AuditLog
            {
                UserId       = userId,
                Action       = pending.Action,
                TableName    = pending.TableName,
                RecordId     = pending.RecordId,
                OldValues    = pending.OldValues,
                NewValues    = pending.NewValues,
                CreatedAtUtc = now,
            });
        }

        return logs;
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    /// <summary>Lấy khoá chính dạng Guid. Khoá phức hợp (vd BranchService) lấy cột Guid đầu tiên.</summary>
    private static Guid ResolveKey(EntityEntry entry)
    {
        var key = entry.Metadata.FindPrimaryKey();
        if (key is null)
            return Guid.Empty;

        foreach (var property in key.Properties)
        {
            if (entry.Property(property.Name).CurrentValue is Guid value)
                return value;
        }

        return Guid.Empty;
    }

    /// <summary>Chụp toàn bộ giá trị các cột của entity.</summary>
    private static Dictionary<string, object?> Snapshot(EntityEntry entry, bool useCurrentValue)
    {
        var values = new Dictionary<string, object?>();

        foreach (var property in entry.Properties)
        {
            var name = property.Metadata.Name;
            if (ExcludedProperties.Contains(name))
                continue;

            values[name] = useCurrentValue ? property.CurrentValue : property.OriginalValue;
        }

        return values;
    }

    /// <summary>Chỉ lấy những cột thật sự đổi giá trị.</summary>
    private static (Dictionary<string, object?> Old, Dictionary<string, object?> New) DiffModified(EntityEntry entry)
    {
        var oldValues = new Dictionary<string, object?>();
        var newValues = new Dictionary<string, object?>();

        foreach (var property in entry.Properties)
        {
            var name = property.Metadata.Name;
            if (!property.IsModified || ExcludedProperties.Contains(name))
                continue;

            if (Equals(property.OriginalValue, property.CurrentValue))
                continue;

            oldValues[name] = property.OriginalValue;
            newValues[name] = property.CurrentValue;
        }

        return (oldValues, newValues);
    }

    private static string Serialize(Dictionary<string, object?> values)
        => JsonSerializer.Serialize(values, JsonOptions);

    private sealed class PendingAudit(string action, string tableName, EntityEntry entry)
    {
        public string      Action    { get; } = action;
        public string      TableName { get; } = tableName;
        public EntityEntry Entry     { get; } = entry;
        public Guid        RecordId  { get; set; }
        public string?     OldValues { get; set; }
        public string?     NewValues { get; set; }
    }
}
