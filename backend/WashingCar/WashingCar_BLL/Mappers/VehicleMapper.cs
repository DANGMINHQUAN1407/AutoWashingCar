using WashingCar_BLL.Policies;
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
        Brand        = v.BrandCatalog?.Name ?? v.Brand,
        BrandCatalogId = v.BrandCatalogId,
        BrandCatalogName = v.BrandCatalog?.Name,
        Model        = v.Model,
        ManufactureYear = v.ManufactureYear,
        EngineType   = v.EngineType.HasValue ? (EngineType)v.EngineType.Value : null,
        BodyStyle    = v.BodyStyle.HasValue ? (BodyStyle)v.BodyStyle.Value : null,
        EngineCatalogId = v.EngineCatalogId,
        EngineCatalogName = v.EngineCatalog?.Name,
        BodyStyleCatalogId = v.BodyStyleCatalogId,
        BodyStyleCatalogName = v.BodyStyleCatalog?.Name,
        VehicleCondition = VehicleConditionPolicy.GetCondition(v.ManufactureYear).ToString(),
        PrimaryImageUrl = v.VehicleImages
            .Where(image => image.IsPrimary)
            .OrderBy(image => image.DisplayOrder)
            .Select(image => image.ImageUrl)
            .FirstOrDefault(),
        CreatedAtUtc = v.CreatedAtUtc,
    };
}