using WashingCar_Common.Enum;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.ServiceCatalog;

namespace WashingCar_BLL.Mappers;

public static class ServiceCatalogMapper
{
    public static ServiceCatalogDto ToDto(this ServiceCatalogItem s) => new()
    {
        ServiceCatalogItemId = s.ServiceCatalogItemId,
        ServiceName = s.ServiceName,
        Description = s.Description,
        BasePrice = s.BasePrice,
        DurationMinutes = s.DurationMinutes,
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

    public static ServiceCatalogTreeDto ToTreeDto(this ServiceCatalogItem s) => new()
    {
        ServiceCatalogItemId = s.ServiceCatalogItemId,
        ServiceName = s.ServiceName,
        Description = s.Description,
        BasePrice = s.BasePrice,
        DurationMinutes = s.DurationMinutes,
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
