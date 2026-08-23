using System.Text.RegularExpressions;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;

namespace WashingCar_BLL.Policies;

public static partial class LicensePlatePolicy
{
    private const string InvalidMessage = "Biển số xe không đúng định dạng.";

    public static string Normalize(string? input, VehicleType vehicleType)
    {
        var compact = Compact(input);

        return vehicleType switch
        {
            VehicleType.Motorbike => NormalizeMotorbike(compact),
            VehicleType.Car or VehicleType.Truck => NormalizeCarOrTruck(compact),
            _ => throw AppException.BadRequest("Loại phương tiện không hợp lệ."),
        };
    }

    private static string Compact(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            throw AppException.BadRequest(InvalidMessage);

        var compact = SeparatorRegex().Replace(input.Trim().ToUpperInvariant(), "");
        if (compact.Length is < 6 or > 12)
            throw AppException.BadRequest(InvalidMessage);

        return compact;
    }

    private static string NormalizeMotorbike(string compact)
    {
        var match = MotorbikeRegex().Match(compact);
        if (!match.Success)
            throw AppException.BadRequest(InvalidMessage);

        return $"{match.Groups["province"].Value}{match.Groups["series"].Value}-{match.Groups["number"].Value}";
    }

    private static string NormalizeCarOrTruck(string compact)
    {
        var match = CarOrTruckRegex().Match(compact);
        if (!match.Success)
            throw AppException.BadRequest(InvalidMessage);

        return $"{match.Groups["province"].Value}{match.Groups["series"].Value}-{match.Groups["number"].Value}";
    }

    [GeneratedRegex(@"[\s\.-]+", RegexOptions.CultureInvariant)]
    private static partial Regex SeparatorRegex();

    [GeneratedRegex(@"^(?<province>\d{2})(?<series>[A-Z]\d{1,2})(?<number>\d{4,5})$", RegexOptions.CultureInvariant)]
    private static partial Regex MotorbikeRegex();

    [GeneratedRegex(@"^(?<province>\d{2})(?<series>[A-Z]{1,2})(?<number>\d{4,5})$", RegexOptions.CultureInvariant)]
    private static partial Regex CarOrTruckRegex();
}
