namespace WashingCar_Common.Enum;

/// <summary>
/// Phân loại nghiệp vụ của dịch vụ trong giỏ booking.
/// </summary>
public enum ServicePackageType : byte
{
    /// <summary>Gói rửa chính; mỗi booking chỉ được chọn tối đa một dịch vụ loại này.</summary>
    Standard = 1,

    /// <summary>Dịch vụ bổ sung; có thể kết hợp với một gói Standard và các AddOn khác nhau.</summary>
    AddOn = 2,

    /// <summary>Gói rửa trọn gói; loại trừ mọi dịch vụ khác trong cùng booking.</summary>
    Premium = 3,
}
