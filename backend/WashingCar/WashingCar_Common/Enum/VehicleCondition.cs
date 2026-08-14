namespace WashingCar_Common.Enum;

/// <summary>
/// Tình trạng được suy ra từ năm sản xuất theo quy tắc nghiệp vụ, không nhập trực tiếp từ khách hàng.
/// </summary>
public enum VehicleCondition : byte
{
    New = 1,
    Standard = 2,
    Old = 3
}
