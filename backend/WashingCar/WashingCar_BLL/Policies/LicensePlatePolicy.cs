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
    /// Kiểm tra tương thích giữa biển số và năm sản xuất:
    /// Biển số 4 số (cũ) chỉ được cấp trước 06/12/2010, nên chỉ áp dụng cho xe sản xuất từ 2010 trở về trước.
    /// Xe sản xuất từ năm 2011 trở đi bắt buộc phải đăng ký biển 5 số (có dấu chấm .xx).
    /// </summary>
    public static void ValidateManufactureYear(string canonicalPlate, int? manufactureYear)
    {
        if (!manufactureYear.HasValue) return;

        // Biển 4 số là biển không chứa dấu chấm '.' ngăn cách
        if (!canonicalPlate.Contains('.'))
        {
            if (manufactureYear.Value > 2010)
            {
                throw AppException.BadRequest($"Biển số 4 số ({canonicalPlate}) chỉ áp dụng cho xe sản xuất từ năm 2010 trở về trước. Xe sản xuất năm {manufactureYear.Value} bắt buộc phải sử dụng biển số 5 số (Ví dụ: 59A1-123.45 hoặc 51F-123.45).");
            }
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
        if (compact.Length is < 7 or > 10)
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
        var formattedNumber = number.Length is 5 or 6
            ? $"{number[..3]}.{number[3..]}"
            : number;
        return $"{province}{series}-{formattedNumber}";
    }

    [GeneratedRegex(@"[\.-]+", RegexOptions.CultureInvariant)]
    private static partial Regex SeparatorRegex();

    [GeneratedRegex(@"^(?<province>\d{2})(?<series>[A-Z][A-Z0-9]{1,2}?)(?<number>\d{5}|\d{4}|\d{6})$", RegexOptions.CultureInvariant)]
    private static partial Regex MotorbikeRegex();

    [GeneratedRegex(@"^(?<province>\d{2})(?<series>[A-Z]{1,2})(?<number>\d{5}|\d{4}|\d{6})$", RegexOptions.CultureInvariant)]
    private static partial Regex CarOrTruckRegex();
}
