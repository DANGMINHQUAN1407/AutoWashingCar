using System.Security.Cryptography;

namespace WashingCar_Common.Helpers;

public static class BookingCodeHelper
{
    private const string Base36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    /// <summary>
    /// Sinh mã booking dạng "BK{yyyyMMdd}{6 ký tự ngẫu nhiên}", ví dụ "BK20260617A1B2C3".
    /// Service phải kiểm tra trùng (UQ_Booking_Code) và sinh lại nếu cần.
    /// </summary>
    public static string NewBookingCode()
        => $"BK{DateTime.UtcNow:yyyyMMdd}{RandomBase36(6)}";

    /// <summary>
    /// Sinh token QR check-in duy nhất (lưu vào CheckInQrCode, UQ_Booking_QrCode).
    /// Frontend tự render ảnh QR từ chuỗi token này.
    /// </summary>
    public static string NewQrToken()
        => Guid.NewGuid().ToString("N") + RandomBase36(8);

    private static string RandomBase36(int length)
    {
        var bytes = RandomNumberGenerator.GetBytes(length);
        var chars = new char[length];
        for (int i = 0; i < length; i++)
            chars[i] = Base36[bytes[i] % 36];
        return new string(chars);
    }
}
