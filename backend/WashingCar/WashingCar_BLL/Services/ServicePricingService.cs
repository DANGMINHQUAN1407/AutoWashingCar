using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.ServicePricing;

namespace WashingCar_BLL.Services;

/// <summary>
/// Quản lý và phân giải bảng giá toàn hệ thống.
/// Một rule được định danh bởi ServiceCatalogItem + VehicleType + EngineCatalogId.
/// EngineCatalogId = null là giá mặc định của loại xe.
/// </summary>
public class ServicePricingService(
    IServiceVehiclePricingRepository pricingRepo,
    IServiceCatalogRepository serviceCatalogRepo,
    IVehicleEngineCatalogRepository engineRepo) : IServicePricingService
{
    public async Task<ServicePricingResolution?> ResolveAsync(
        Guid serviceCatalogItemId,
        byte vehicleType,
        Guid? engineCatalogId,
        CancellationToken ct = default)
    {
        var pricing = await pricingRepo.GetBestActiveAsync(
            serviceCatalogItemId,
            vehicleType,
            engineCatalogId,
            ct);

        return pricing is null
            ? null
            : ToResolution(pricing);
    }

    public async Task<IReadOnlyList<ServicePricingDto>> GetForServiceAsync(
        Guid serviceCatalogItemId,
        bool includeInactive,
        CancellationToken ct = default)
    {
        _ = await serviceCatalogRepo.GetByIdAsync(serviceCatalogItemId)
            ?? throw AppException.NotFound(ValidationMessage.ServicePricing.ServiceNotFound);

        var items = await pricingRepo.GetForServiceAsync(
            serviceCatalogItemId,
            includeInactive,
            ct);

        return items.Select(ToDto).ToList();
    }

    public async Task<ServicePricingDto> CreateAsync(
        CreateServicePricingRequest request,
        CancellationToken ct = default)
    {
        ValidateVehicleType(request.VehicleType);

        var service = await serviceCatalogRepo.GetByIdAsync(request.ServiceCatalogItemId)
            ?? throw AppException.NotFound(ValidationMessage.ServicePricing.ServiceNotFound);

        ValidateBookableService(service);

        VehicleEngineCatalog? engine = null;
        if (request.EngineCatalogId.HasValue)
        {
            engine = await engineRepo.GetByIdAsync(request.EngineCatalogId.Value)
                ?? throw AppException.NotFound(ValidationMessage.ServicePricing.EngineNotFound);

            if (!engine.IsActive)
                throw AppException.BadRequest(ValidationMessage.ServicePricing.EngineInactive);
        }

        if (await pricingRepo.ExistsScopeAsync(
                request.ServiceCatalogItemId,
                (byte)request.VehicleType,
                request.EngineCatalogId,
                ct: ct))
        {
            throw AppException.Conflict(ValidationMessage.ServicePricing.DuplicateScope);
        }

        var entity = new ServiceVehiclePricing
        {
            ServiceVehiclePricingId = Guid.NewGuid(),
            ServiceCatalogItemId = request.ServiceCatalogItemId,
            VehicleType = request.VehicleType,
            EngineCatalogId = request.EngineCatalogId,
            UnitPrice = request.UnitPrice,
            DurationMinutes = request.DurationMinutes,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        };

        try
        {
            await pricingRepo.AddAsync(entity, ct);
            await pricingRepo.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (IsUniqueScopeViolation(ex))
        {
            throw AppException.Conflict(ValidationMessage.ServicePricing.DuplicateScope);
        }

        entity.ServiceCatalogItem = service;
        entity.EngineCatalog = engine;
        return ToDto(entity);
    }

    public async Task<ServicePricingDto> UpdateAsync(
        Guid pricingId,
        UpdateServicePricingRequest request,
        CancellationToken ct = default)
    {
        var entity = await pricingRepo.GetByIdAsync(pricingId)
            ?? throw AppException.NotFound(ValidationMessage.ServicePricing.NotFound);

        if (!request.IsActive && entity.IsActive)
            await EnsureNotLastActiveRuleAsync(entity, ct);

        entity.UnitPrice = request.UnitPrice;
        entity.DurationMinutes = request.DurationMinutes;
        entity.IsActive = request.IsActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;

        await pricingRepo.UpdateAsync(entity, ct);
        await pricingRepo.SaveChangesAsync(ct);
        return ToDto(entity);
    }

    public async Task SetActiveAsync(
        Guid pricingId,
        bool isActive,
        CancellationToken ct = default)
    {
        var entity = await pricingRepo.GetByIdAsync(pricingId)
            ?? throw AppException.NotFound(ValidationMessage.ServicePricing.NotFound);

        if (entity.IsActive == isActive)
            return;

        if (!isActive)
            await EnsureNotLastActiveRuleAsync(entity, ct);

        entity.IsActive = isActive;
        entity.UpdatedAtUtc = DateTime.UtcNow;
        await pricingRepo.UpdateAsync(entity, ct);
        await pricingRepo.SaveChangesAsync(ct);
    }

    private async Task EnsureNotLastActiveRuleAsync(
        ServiceVehiclePricing entity,
        CancellationToken ct)
    {
        var rules = await pricingRepo.GetForServiceAsync(
            entity.ServiceCatalogItemId,
            includeInactive: false,
            ct: ct);

        if (rules.Count == 1)
            throw AppException.BadRequest(
                ValidationMessage.ServicePricing.CannotDeactivateLastRule);
    }

    private static void ValidateVehicleType(VehicleType vehicleType)
    {
        if (!Enum.IsDefined(typeof(VehicleType), vehicleType))
            throw AppException.BadRequest(ValidationMessage.ServicePricing.InvalidVehicleType);
    }

    private static void ValidateBookableService(ServiceCatalogItem service)
    {
        if (service.ServiceNodeType != (byte)ServiceNodeType.Leaf)
            throw AppException.BadRequest(ValidationMessage.ServicePricing.ServiceMustBeLeaf);

        if (!service.IsActive)
            throw AppException.BadRequest(ValidationMessage.ServicePricing.ServiceInactive);
    }

    private static bool IsUniqueScopeViolation(DbUpdateException exception)
        => exception.InnerException is SqlException sql
            && (sql.Number == 2601 || sql.Number == 2627);

    private static ServicePricingResolution ToResolution(ServiceVehiclePricing entity)
        => new()
        {
            ServiceVehiclePricingId = entity.ServiceVehiclePricingId,
            ServiceCatalogItemId = entity.ServiceCatalogItemId,
            VehicleType = entity.VehicleType,
            EngineCatalogId = entity.EngineCatalogId,
            UnitPrice = entity.UnitPrice,
            DurationMinutes = entity.DurationMinutes,
            IsEngineSpecific = entity.EngineCatalogId.HasValue,
        };

    private static ServicePricingDto ToDto(ServiceVehiclePricing entity)
        => new()
        {
            ServiceVehiclePricingId = entity.ServiceVehiclePricingId,
            ServiceCatalogItemId = entity.ServiceCatalogItemId,
            ServiceName = entity.ServiceCatalogItem?.ServiceName ?? string.Empty,
            VehicleType = entity.VehicleType,
            EngineCatalogId = entity.EngineCatalogId,
            EngineName = entity.EngineCatalog?.Name,
            UnitPrice = entity.UnitPrice,
            DurationMinutes = entity.DurationMinutes,
            IsActive = entity.IsActive,
        };
}
