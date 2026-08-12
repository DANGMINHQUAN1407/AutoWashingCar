namespace WashingCar_DAL.Interfaces;

/// <summary>
/// Cung cấp id của người dùng đang thao tác để ghi vào AuditLog.
/// Trả về null khi không có người dùng (background job, seeder, request ẩn danh).
/// </summary>
public interface ICurrentUserAccessor
{
    Guid? UserId { get; }
}
