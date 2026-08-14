using WashingCar_Common.Enum;

namespace WashingCar_BLL.Policies;

public static class VehicleConditionPolicy
{
    public const decimal NewVehicleSurchargeRate = 0.10m;
    public const decimal StandardVehicleSurchargeRate = 0m;
    public const decimal OldVehicleSurchargeRate = 0.15m;

    public static VehicleCondition GetCondition(int? manufactureYear, int? currentYear = null)
    {
        if (!manufactureYear.HasValue)
        {
            return VehicleCondition.Standard;
        }

        var vietnamCurrentYear = DateTime.UtcNow.AddHours(7).Year;
        var age = (currentYear ?? vietnamCurrentYear) - manufactureYear.Value;

        return age switch
        {
            >= 0 and <= 3 => VehicleCondition.New,
            >= 4 and <= 7 => VehicleCondition.Standard,
            >= 8 => VehicleCondition.Old,
            _ => VehicleCondition.Standard
        };
    }

    public static decimal GetSurchargeRate(VehicleCondition condition) => condition switch
    {
        VehicleCondition.New => NewVehicleSurchargeRate,
        VehicleCondition.Old => OldVehicleSurchargeRate,
        _ => StandardVehicleSurchargeRate
    };
}
