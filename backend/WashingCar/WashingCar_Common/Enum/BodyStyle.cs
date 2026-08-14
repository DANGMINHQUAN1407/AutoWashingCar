namespace WashingCar_Common.Enum;

/// <summary>
/// Kiểu dáng thân xe. Giá trị được lưu dạng byte trong database.
/// </summary>
public enum BodyStyle : byte
{
    Sedan = 1,
    SUV = 2,
    Hatchback = 3,
    Pickup = 4,
    Van = 5,
    Minivan = 6,
    Coupe = 7,
    Convertible = 8
}
