using WashingCar_Common.Enum;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_BLL.Mappers;

public static class ServiceCatalogMapper
{
    public static string GetVehicleTypeName(byte? vehicleType) => vehicleType switch
    {
        1 => "Xe máy",
        2 => "Ô tô",
        3 => "Xe tải",
        _ => "Tất cả loại xe"
    };

    public static ServiceCatalogDto ToDto(
        this ServiceCatalogItem s,
        VehicleType? vehicleType = null,
        Guid? engineCatalogId = null)
    {
        var applicablePricing = vehicleType.HasValue
            ? s.ServiceVehiclePricings
                .Where(p => p.IsActive
                    && p.VehicleType == vehicleType.Value
                    && (p.EngineCatalogId == null || p.EngineCatalogId == engineCatalogId)
                    && (p.EngineCatalogId == null || p.EngineCatalog?.IsActive == true))
                .OrderBy(p => p.EngineCatalogId == engineCatalogId ? 0 : 1)
                .FirstOrDefault()
            : null;

        return new ServiceCatalogDto
        {
            ServiceCatalogItemId = s.ServiceCatalogItemId,
            ServiceName = s.ServiceName,
            Description = s.Description,
            BasePrice = s.BasePrice,
            ApplicablePrice = s.VehicleType.HasValue ? s.BasePrice : (applicablePricing?.UnitPrice ?? s.BasePrice),
            ApplicableDurationMinutes = s.VehicleType.HasValue ? s.DurationMinutes : (applicablePricing?.DurationMinutes ?? s.DurationMinutes),
            VehicleType = s.VehicleType,
            VehicleTypeName = GetVehicleTypeName(s.VehicleType),
            ServicePackageType = s.ServicePackageType,
            ServicePackageTypeName = Enum.IsDefined(typeof(ServicePackageType), s.ServicePackageType)
                ? ((ServicePackageType)s.ServicePackageType).ToString()
                : "Unknown",
            ServiceNodeType = s.ServiceNodeType,
            ServiceNodeTypeName = Enum.IsDefined(typeof(ServiceNodeType), s.ServiceNodeType)
                ? ((ServiceNodeType)s.ServiceNodeType).ToString()
                : "Unknown",
            ParentServiceCatalogItemId = s.ParentServiceCatalogItemId,
            SelectionMode = s.SelectionMode,
            IsBookable = s.ServiceNodeType == (byte)ServiceNodeType.Leaf,
            IsActive = s.IsActive,
            CreatedAtUtc = s.CreatedAtUtc,
        };
    }

    public static ServiceCatalogTreeDto ToTreeDto(this ServiceCatalogItem s) => new()
    {
        ServiceCatalogItemId = s.ServiceCatalogItemId,
        ServiceName = s.ServiceName,
        Description = s.Description,
        BasePrice = s.BasePrice,
        DurationMinutes = s.DurationMinutes,
        VehicleType = s.VehicleType,
        VehicleTypeName = GetVehicleTypeName(s.VehicleType),
        ServicePackageType = s.ServicePackageType,
        ServicePackageTypeName = Enum.IsDefined(typeof(ServicePackageType), s.ServicePackageType)
            ? ((ServicePackageType)s.ServicePackageType).ToString()
            : "Unknown",
        ServiceNodeType = s.ServiceNodeType,
        ServiceNodeTypeName = Enum.IsDefined(typeof(ServiceNodeType), s.ServiceNodeType)
            ? ((ServiceNodeType)s.ServiceNodeType).ToString()
            : "Unknown",
        ParentServiceCatalogItemId = s.ParentServiceCatalogItemId,
        SelectionMode = s.SelectionMode,
        IsBookable = s.ServiceNodeType == (byte)ServiceNodeType.Leaf,
        IsSelectable = s.IsActive,
        IsActive = s.IsActive,
        CreatedAtUtc = s.CreatedAtUtc,
        Children = s.ChildServiceCatalogItems
            .Where(x => x.IsActive)
            .OrderBy(x => x.ServiceName)
            .Select(x => x.ToTreeDto())
            .ToList(),
    };
}
