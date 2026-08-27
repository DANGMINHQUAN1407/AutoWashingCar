using System.Text.RegularExpressions;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;

namespace WashingCar_BLL.Policies;

public static partial class LicensePlatePolicy
{
    private const string InvalidMessage = "Biển số xe không đúng định dạng.";

    public static string Normalize(string? input, VehicleType vehicleType)
    {
        var raw = Prepare(input);
        var compact = Compact(raw);
        var hasSeparator = raw.Contains('-') || raw.Contains('.');

        var canonical = vehicleType switch
        {
            VehicleType.Motorbike => NormalizeMotorbike(compact),
            VehicleType.Car or VehicleType.Truck => NormalizeCarOrTruck(compact),
            _ => throw AppException.BadRequest("Loại phương tiện không hợp lệ."),
        };

        // Cho phép hai dạng duy nhất: chuỗi compact không có separator hoặc canonical đầy đủ.
        // Dạng nửa đúng như "60A-882922" hoặc separator sai vị trí phải bị từ chối,
        // không được âm thầm đoán hoặc biến đổi thành dữ liệu khác.
        if (hasSeparator && !string.Equals(raw, canonical, StringComparison.Ordinal))
            throw AppException.BadRequest(InvalidMessage);

        return canonical;
    }

    /// <summary>
    /// Kiểm tra tương thích giữa biển số và năm sản xuất.
    /// Xe sản xuất từ năm 2011 trở đi (>= 2011) bắt buộc dùng biển 5 số.
    /// Xe sản xuất từ 2010 trở về trước (<= 2010) cho phép cả biển 4 số và 5 số.
    /// </summary>
    public static void ValidateManufactureYear(string canonicalPlate, int? manufactureYear)
    {
        if (!manufactureYear.HasValue) return;

        var currentYear = DateTime.UtcNow.Year;
        if (manufactureYear.Value < 1950 || manufactureYear.Value > currentYear + 1)
        {
            throw AppException.BadRequest($"Năm sản xuất không hợp lệ (hợp lệ từ 1950 đến {currentYear + 1}).");
        }

        var parts = canonicalPlate.Split('-');
        if (parts.Length < 2) return;

        var numberDigits = string.Concat(parts.Last().Where(char.IsDigit));
        if (manufactureYear.Value >= 2011 && numberDigits.Length == 4)
        {
            throw AppException.BadRequest("Xe sản xuất từ năm 2011 bắt buộc sử dụng biển 5 số (VD: 51F1-123.45 hoặc 51F-123.45).");
        }
    }

    private static string Prepare(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            throw AppException.BadRequest(InvalidMessage);

        var raw = input.Trim().ToUpperInvariant();
        if (raw.Any(char.IsWhiteSpace)
            || raw.Any(ch => ch != '-' && ch != '.' && !char.IsLetterOrDigit(ch)))
            throw AppException.BadRequest(InvalidMessage);

        return raw;
    }

    private static string Compact(string raw)
    {
        var compact = SeparatorRegex().Replace(raw, "");
        if (compact.Length is < 7 or > 9)
            throw AppException.BadRequest(InvalidMessage);

        return compact;
    }

    private static string NormalizeMotorbike(string compact)
    {
        var match = MotorbikeRegex().Match(compact);
        if (!match.Success)
            throw AppException.BadRequest(InvalidMessage);

        return FormatCanonical(
            match.Groups["province"].Value,
            match.Groups["series"].Value,
            match.Groups["number"].Value);
    }

    private static string NormalizeCarOrTruck(string compact)
    {
        var match = CarOrTruckRegex().Match(compact);
        if (!match.Success)
            throw AppException.BadRequest(InvalidMessage);

        return FormatCanonical(
            match.Groups["province"].Value,
            match.Groups["series"].Value,
            match.Groups["number"].Value);
    }

    private static string FormatCanonical(string province, string series, string number)
    {
        var formattedNumber = number.Length == 5
            ? $"{number[..3]}.{number[3..]}"
            : number;
        return $"{province}{series}-{formattedNumber}";
    }

    [GeneratedRegex(@"[\.-]+", RegexOptions.CultureInvariant)]
    private static partial Regex SeparatorRegex();

    [GeneratedRegex(@"^(?<province>\d{2})(?<series>[A-Z][A-Z0-9]{1,2}?)(?<number>\d{5}|\d{4})$", RegexOptions.CultureInvariant)]
    private static partial Regex MotorbikeRegex();

    [GeneratedRegex(@"^(?<province>\d{2})(?<series>[A-Z]{1,2})(?<number>\d{5}|\d{4})$", RegexOptions.CultureInvariant)]
    private static partial Regex CarOrTruckRegex();
}
