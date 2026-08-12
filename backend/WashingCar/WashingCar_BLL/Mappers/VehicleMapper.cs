using WashingCar_Common.Enum;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_BLL.Mappers;

public static class VehicleMapper
{
    public static VehicleDto ToDto(this Vehicle v) => new()
    {
        VehicleId    = v.VehicleId,
        LicensePlate = v.LicensePlate,
        VehicleType  = (VehicleType)v.VehicleType,
        Brand        = v.Brand,
        CreatedAtUtc = v.CreatedAtUtc,
    };
}