namespace WashingCar_Common.Enum;

/// <summary>
/// Nguồn động lực của xe. Giá trị được lưu dạng byte trong database.
/// </summary>
public enum EngineType : byte
{
    Petrol = 1,
    Diesel = 2,
    Electric = 3,
    Hybrid = 4
}
