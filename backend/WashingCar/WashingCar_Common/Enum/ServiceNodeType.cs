namespace WashingCar_Common.Enum;

/// <summary>
/// Phân biệt node nhóm dùng để chọn nhanh và node dịch vụ thực tế được book/tính tiền.
/// </summary>
public enum ServiceNodeType : byte
{
    Group = 1,
    Leaf = 2,
}
