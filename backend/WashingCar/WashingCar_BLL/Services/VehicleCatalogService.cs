using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.VehicleCatalog;

namespace WashingCar_BLL.Services;

public class VehicleCatalogService(
    IVehicleEngineCatalogRepository engineRepo,
    IVehicleBodyStyleCatalogRepository bodyStyleRepo,
    IVehicleBrandCatalogRepository brandRepo,
    ILogger<VehicleCatalogService> logger) : IVehicleCatalogService
{
    public async Task<PagedResult<VehicleCatalogItemDto>> GetEngineTypesAsync(VehicleCatalogQuery query)
    {
        var (items, totalCount) = await engineRepo.GetAllPaginatedAsync(query);
        return new PagedResult<VehicleCatalogItemDto>
        {
            Items = items.Select(ToDto).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<PagedResult<VehicleCatalogItemDto>> GetBodyStylesAsync(VehicleCatalogQuery query)
    {
        var (items, totalCount) = await bodyStyleRepo.GetAllPaginatedAsync(query);
        return new PagedResult<VehicleCatalogItemDto>
        {
            Items = items.Select(ToDto).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<VehicleCatalogItemDto> GetEngineTypeByIdAsync(Guid id)
        => ToDto(await engineRepo.GetByIdAsync(id) ?? throw AppException.NotFound("Không tìm thấy loại động cơ."));

    public async Task<VehicleCatalogItemDto> GetBodyStyleByIdAsync(Guid id)
        => ToDto(await bodyStyleRepo.GetByIdAsync(id) ?? throw AppException.NotFound("Không tìm thấy kiểu dáng xe."));

    public async Task<VehicleCatalogItemDto> CreateEngineTypeAsync(CreateVehicleCatalogRequest request)
    {
        var code = NormalizeCode(request.Code);
        var name = NormalizeName(request.Name);
        if (await engineRepo.ExistsCodeAsync(code))
            throw AppException.Conflict("Mã loại động cơ đã tồn tại.");
        if (await engineRepo.ExistsNameAsync(name))
            throw AppException.Conflict("Tên loại động cơ đã tồn tại.");

        var item = await engineRepo.CreateAsync(new VehicleEngineCatalog
        {
            VehicleEngineCatalogId = Guid.NewGuid(),
            Code = code,
            Name = name,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion = [],
        });
        logger.LogInformation("Created vehicle engine catalog {CatalogId}", item.VehicleEngineCatalogId);
        return ToDto(item);
    }

    public async Task<VehicleCatalogItemDto> UpdateEngineTypeAsync(Guid id, UpdateVehicleCatalogRequest request)
    {
        var item = await engineRepo.GetByIdAsync(id)
            ?? throw AppException.NotFound("Không tìm thấy loại động cơ.");
        var name = NormalizeName(request.Name);
        if (await engineRepo.ExistsNameAsync(name, excludeId: id))
            throw AppException.Conflict("Tên loại động cơ đã tồn tại.");
        item.Name = name;
        item.IsActive = request.IsActive;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await engineRepo.UpdateAsync(item);
        return ToDto(item);
    }

    public async Task SetEngineTypeActiveAsync(Guid id, bool isActive)
    {
        var item = await engineRepo.GetByIdAsync(id)
            ?? throw AppException.NotFound("Không tìm thấy loại động cơ.");
        if (item.IsActive == isActive) return;
        item.IsActive = isActive;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await engineRepo.UpdateAsync(item);
    }

    public async Task<VehicleCatalogItemDto> CreateBodyStyleAsync(CreateVehicleCatalogRequest request)
    {
        if (request.VehicleType is null)
            throw AppException.BadRequest("Phải chọn loại phương tiện cho kiểu dáng xe.");

        var vehicleType = EnsureSupportedVehicleType(request.VehicleType.Value);
        var code = NormalizeCode(request.Code);
        var name = NormalizeName(request.Name);
        if (await bodyStyleRepo.ExistsCodeAsync(code))
            throw AppException.Conflict("Mã kiểu dáng xe đã tồn tại.");
        if (await bodyStyleRepo.ExistsNameAsync(name))
            throw AppException.Conflict("Tên kiểu dáng xe đã tồn tại.");

        var item = await bodyStyleRepo.CreateAsync(new VehicleBodyStyleCatalog
        {
            VehicleBodyStyleCatalogId = Guid.NewGuid(),
            Code = code,
            Name = name,
            VehicleType = (byte)vehicleType,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion = [],
        });
        logger.LogInformation("Created vehicle body-style catalog {CatalogId} for {VehicleType}", item.VehicleBodyStyleCatalogId, vehicleType);
        return ToDto(item);
    }

    public async Task<VehicleCatalogItemDto> UpdateBodyStyleAsync(Guid id, UpdateVehicleCatalogRequest request)
    {
        var item = await bodyStyleRepo.GetByIdAsync(id)
            ?? throw AppException.NotFound("Không tìm thấy kiểu dáng xe.");
        var name = NormalizeName(request.Name);
        if (await bodyStyleRepo.ExistsNameAsync(name, excludeId: id))
            throw AppException.Conflict("Tên kiểu dáng xe đã tồn tại.");
        item.Name = name;
        item.IsActive = request.IsActive;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await bodyStyleRepo.UpdateAsync(item);
        return ToDto(item);
    }

    public async Task SetBodyStyleActiveAsync(Guid id, bool isActive)
    {
        var item = await bodyStyleRepo.GetByIdAsync(id)
            ?? throw AppException.NotFound("Không tìm thấy kiểu dáng xe.");
        if (item.IsActive == isActive) return;
        item.IsActive = isActive;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await bodyStyleRepo.UpdateAsync(item);
    }

    public async Task<PagedResult<VehicleCatalogItemDto>> GetBrandsAsync(VehicleCatalogQuery query)
    {
        var (items, totalCount) = await brandRepo.GetAllPaginatedAsync(query);
        return new PagedResult<VehicleCatalogItemDto>
        {
            Items = items.Select(ToDto).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<VehicleCatalogItemDto> GetBrandByIdAsync(Guid id)
        => ToDto(await brandRepo.GetByIdAsync(id) ?? throw AppException.NotFound("Không tìm thấy hãng xe."));

    public async Task<VehicleCatalogItemDto> CreateBrandAsync(CreateVehicleCatalogRequest request)
    {
        var code = NormalizeCode(request.Code);
        var name = NormalizeName(request.Name);
        if (await brandRepo.ExistsCodeAsync(code))
            throw AppException.Conflict("Mã hãng xe đã tồn tại.");
        if (await brandRepo.ExistsNameAsync(name))
            throw AppException.Conflict("Tên hãng xe đã tồn tại.");

        var item = await brandRepo.CreateAsync(new VehicleBrandCatalog
        {
            VehicleBrandCatalogId = Guid.NewGuid(),
            Code = code,
            Name = name,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion = [],
        });
        logger.LogInformation("Created vehicle brand catalog {CatalogId}", item.VehicleBrandCatalogId);
        return ToDto(item);
    }

    public async Task<VehicleCatalogItemDto> UpdateBrandAsync(Guid id, UpdateVehicleCatalogRequest request)
    {
        var item = await brandRepo.GetByIdAsync(id)
            ?? throw AppException.NotFound("Không tìm thấy hãng xe.");
        var name = NormalizeName(request.Name);
        if (await brandRepo.ExistsNameAsync(name, excludeId: id))
            throw AppException.Conflict("Tên hãng xe đã tồn tại.");

        item.Name = name;
        item.IsActive = request.IsActive;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await brandRepo.UpdateAsync(item);
        return ToDto(item);
    }

    public async Task SetBrandActiveAsync(Guid id, bool isActive)
    {
        var item = await brandRepo.GetByIdAsync(id)
            ?? throw AppException.NotFound("Không tìm thấy hãng xe.");
        if (item.IsActive == isActive) return;
        item.IsActive = isActive;
        item.UpdatedAtUtc = DateTime.UtcNow;
        await brandRepo.UpdateAsync(item);
    }

    private static string NormalizeCode(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw AppException.BadRequest("Mã catalog không được để trống.");
        return value.Trim().ToUpperInvariant();
    }

    private static string NormalizeName(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
            throw AppException.BadRequest("Tên catalog không được để trống.");
        return value.Trim();
    }

    private static VehicleCatalogItemDto ToDto(VehicleEngineCatalog item) => new()
    {
        Id = item.VehicleEngineCatalogId,
        Code = item.Code,
        Name = item.Name,
        IsActive = item.IsActive,
        LegacyEnumValue = item.LegacyEnumValue,
    };

    private static VehicleCatalogItemDto ToDto(VehicleBodyStyleCatalog item) => new()
    {
        Id = item.VehicleBodyStyleCatalogId,
        Code = item.Code,
        Name = item.Name,
        IsActive = item.IsActive,
        LegacyEnumValue = item.LegacyEnumValue,
        VehicleType = (VehicleType)item.VehicleType,
    };

    private static VehicleCatalogItemDto ToDto(VehicleBrandCatalog item) => new()
    {
        Id = item.VehicleBrandCatalogId,
        Code = item.Code,
        Name = item.Name,
        IsActive = item.IsActive,
    };

    private static VehicleType EnsureSupportedVehicleType(VehicleType vehicleType)
        => vehicleType is VehicleType.Motorbike or VehicleType.Car or VehicleType.Truck
            ? vehicleType
            : throw AppException.BadRequest("Loại phương tiện không được hỗ trợ cho catalog kiểu dáng.");
}
