using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_BLL.Policies;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_BLL.Services
{
    public class VehicleService : IVehicleService
    {
        private readonly IVehicleRepository _vehicleRepo;
        private readonly IVehicleEngineCatalogRepository _engineCatalogRepo;
        private readonly IVehicleBodyStyleCatalogRepository _bodyStyleCatalogRepo;
        private readonly IVehicleBrandCatalogRepository _brandCatalogRepo;
        private readonly ILogger<VehicleService> _logger;

        public VehicleService(
            IVehicleRepository vehicleRepo,
            IVehicleEngineCatalogRepository engineCatalogRepo,
            IVehicleBodyStyleCatalogRepository bodyStyleCatalogRepo,
            IVehicleBrandCatalogRepository brandCatalogRepo,
            ILogger<VehicleService> logger)
        {
            _vehicleRepo = vehicleRepo;
            _engineCatalogRepo = engineCatalogRepo;
            _bodyStyleCatalogRepo = bodyStyleCatalogRepo;
            _brandCatalogRepo = brandCatalogRepo;
            _logger = logger;
        }

        /// <summary>Danh sách xe (chưa xoá mềm) của khách đang đăng nhập.</summary>
        /// <remarks>Gọi: IVehicleRepository.GetByUserIdAsync.</remarks>
        public async Task<PagedResult<VehicleDto>> GetMyVehiclesAsync(
            Guid userId, VehicleQuery query, CancellationToken ct = default)
        {
            var (vehicles, totalCount) = await _vehicleRepo.GetByUserIdAsync(userId, query, ct);
            return new PagedResult<VehicleDto>
            {
                Items = vehicles.Select(v => v.ToDto()).ToList(),
                TotalCount = totalCount,
                PageNumber = query.Page,
                PageSize = query.PageSize,
            };
        }

        /// <summary>Data isolation ở tầng query: 404 (không phải 403) nếu xe thuộc user khác — tránh lộ "xe này tồn tại".</summary>
        /// <remarks>Gọi: IVehicleRepository.GetByIdAsync(vehicleId, userId).</remarks>
        public async Task<VehicleDto> GetByIdAsync(Guid userId, Guid vehicleId)
        {
            var vehicle = await _vehicleRepo.GetByIdAsync(vehicleId, userId)
            ?? throw AppException.NotFound(ValidationMessage.Vehicle.NotFound);
            return vehicle.ToDto();
        }

        /// <summary>Đăng ký xe mới cho khách. Biển số được chuẩn hoá viết hoa và phải duy nhất trong các xe chưa xoá.</summary>
        /// <remarks>Gọi: IVehicleRepository.ExistsLicensePlateAsync → CreateAsync.</remarks>
        public async Task<VehicleDto> CreateAsync(Guid userId, CreateVehicleRequest request)
        {
            var plate = LicensePlatePolicy.Normalize(request.LicensePlate, request.VehicleType);

            if (await _vehicleRepo.ExistsLicensePlateAsync(plate))
                throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);
            var engine = await ResolveEngineAsync(request.EngineCatalogId, request.EngineType);
            var bodyStyle = await ResolveBodyStyleAsync(request.BodyStyleCatalogId, request.BodyStyle, request.VehicleType);
            var brand = await ResolveBrandAsync(request.BrandCatalogId, request.Brand, request.VehicleType);
            var vehicle = new Vehicle
            {
                UserId = userId,
                LicensePlate = plate,
                VehicleType = (byte)request.VehicleType,
                Brand = brand.Name,
                BrandCatalogId = brand.CatalogId,
                Model = NormalizeOptionalText(request.Model),
                ManufactureYear = request.ManufactureYear,
                EngineCatalogId = engine.CatalogId,
                EngineType = engine.LegacyValue,
                BodyStyleCatalogId = bodyStyle.CatalogId,
                BodyStyle = bodyStyle.LegacyValue,
                IsDeleted = false,
                CreatedAtUtc = DateTime.UtcNow,
                RowVersion = [],
            };

            var created = await _vehicleRepo.CreateAsync(vehicle);
            _logger.LogInformation("User {UserId} created vehicle {VehicleId}", userId, created.VehicleId);
            return created.ToDto();
        }

        /// <summary>Cập nhật xe của chính khách (biển số/loại/hãng). Kiểm tra quyền sở hữu và biển số không trùng xe khác.</summary>
        /// <remarks>Gọi: IVehicleRepository.GetByIdAsync + ExistsLicensePlateAsync (excludeId) → UpdateAsync.</remarks>
        public async Task<VehicleDto> UpdateAsync(Guid userId, Guid vehicleId, UpdateVehicleRequest request)
        {
            var vehicle = await _vehicleRepo.GetByIdAsync(vehicleId, userId)
            ?? throw AppException.NotFound(ValidationMessage.Vehicle.NotFound);

            var plate = LicensePlatePolicy.Normalize(request.LicensePlate, request.VehicleType);

            if (await _vehicleRepo.ExistsLicensePlateAsync(plate, excludeId: vehicleId))
                throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);

            vehicle.LicensePlate = plate;
            vehicle.VehicleType = (byte)request.VehicleType;
            vehicle.Model = NormalizeOptionalText(request.Model);
            vehicle.ManufactureYear = request.ManufactureYear;
            var engine = await ResolveEngineAsync(request.EngineCatalogId, request.EngineType);
            var bodyStyle = await ResolveBodyStyleAsync(request.BodyStyleCatalogId, request.BodyStyle, request.VehicleType);
            var brand = await ResolveBrandAsync(request.BrandCatalogId, request.Brand, request.VehicleType);
            vehicle.EngineCatalogId = engine.CatalogId;
            vehicle.EngineType = engine.LegacyValue;
            vehicle.BodyStyleCatalogId = bodyStyle.CatalogId;
            vehicle.BodyStyle = bodyStyle.LegacyValue;
            vehicle.BrandCatalogId = brand.CatalogId;
            vehicle.Brand = brand.Name;

            await _vehicleRepo.UpdateAsync(vehicle);
            _logger.LogInformation("User {UserId} updated vehicle {VehicleId}", userId, vehicleId);
            return vehicle.ToDto();

        }

        private async Task<(Guid? CatalogId, byte? LegacyValue)> ResolveEngineAsync(Guid? catalogId, EngineType? legacyValue)
        {
            if (!catalogId.HasValue)
                return (null, legacyValue.HasValue ? (byte)legacyValue.Value : null);

            var catalog = await _engineCatalogRepo.GetByIdAsync(catalogId.Value)
                ?? throw AppException.NotFound("Không tìm thấy loại động cơ.");
            if (!catalog.IsActive)
                throw AppException.BadRequest("Loại động cơ đã bị vô hiệu hóa.");
            return (catalog.VehicleEngineCatalogId, catalog.LegacyEnumValue ?? (legacyValue.HasValue ? (byte)legacyValue.Value : null));
        }

        private async Task<(Guid? CatalogId, byte? LegacyValue)> ResolveBodyStyleAsync(Guid? catalogId, BodyStyle? legacyValue, VehicleType vehicleType)
        {
            if (!catalogId.HasValue)
                return (null, legacyValue.HasValue ? (byte)legacyValue.Value : null);

            var catalog = await _bodyStyleCatalogRepo.GetByIdAsync(catalogId.Value)
                ?? throw AppException.NotFound("Không tìm thấy kiểu dáng xe.");
            if (!catalog.IsActive)
                throw AppException.BadRequest("Kiểu dáng xe đã bị vô hiệu hóa.");
            if (catalog.VehicleType != (byte)vehicleType)
                throw AppException.BadRequest("Kiểu dáng xe không phù hợp với loại phương tiện đã chọn.");
            return (catalog.VehicleBodyStyleCatalogId, catalog.LegacyEnumValue ?? (legacyValue.HasValue ? (byte)legacyValue.Value : null));
        }

        private async Task<(Guid? CatalogId, string? Name)> ResolveBrandAsync(Guid? catalogId, string? fallbackName, VehicleType vehicleType)
        {
            if (!catalogId.HasValue)
                return (null, NormalizeOptionalText(fallbackName));

            var catalog = await _brandCatalogRepo.GetByIdAsync(catalogId.Value)
                ?? throw AppException.NotFound("KhÃ´ng tÃ¬m tháº¥y hÃ£ng xe.");
            if (!catalog.IsActive)
                throw AppException.BadRequest("HÃ£ng xe Ä‘Ã£ bá»‹ vÃ´ hiá»‡u hÃ³a.");
            if (catalog.VehicleType != (byte)vehicleType)
                throw AppException.BadRequest("HÃ£ng xe khÃ´ng phÃ¹ há»£p vá»›i loáº¡i phÆ°Æ¡ng tiá»‡n Ä‘Ã£ chá»n.");
            return (catalog.VehicleBrandCatalogId, catalog.Name);
        }

        public async Task<List<VehicleImageDto>> GetImagesAsync(Guid userId, Guid vehicleId)
        {
            _ = await _vehicleRepo.GetByIdAsync(vehicleId, userId)
                ?? throw AppException.NotFound(ValidationMessage.Vehicle.NotFound);

            var images = await _vehicleRepo.GetImagesAsync(vehicleId, userId);
            return images.Select(image => image.ToDto()).ToList();
        }

        public async Task<VehicleImageDto> AddImageAsync(Guid userId, Guid vehicleId, string imageUrl)
        {
            var vehicle = await _vehicleRepo.GetByIdAsync(vehicleId, userId)
                ?? throw AppException.NotFound(ValidationMessage.Vehicle.NotFound);

            if (vehicle.VehicleImages.Count >= 5)
            {
                throw AppException.Conflict("Mỗi xe chỉ được tải lên tối đa 5 ảnh.");
            }

            if (string.IsNullOrWhiteSpace(imageUrl))
            {
                throw AppException.BadRequest("Đường dẫn ảnh xe không hợp lệ.");
            }

            var image = new VehicleImage
            {
                VehicleImageId = Guid.NewGuid(),
                VehicleId = vehicleId,
                ImageUrl = imageUrl,
                IsPrimary = vehicle.VehicleImages.Count == 0,
                DisplayOrder = vehicle.VehicleImages.Count == 0
                    ? 0
                    : vehicle.VehicleImages.Max(existingImage => existingImage.DisplayOrder) + 1,
                UploadedAtUtc = DateTime.UtcNow
            };

            var created = await _vehicleRepo.AddImageAsync(image);
            _logger.LogInformation("User {UserId} uploaded vehicle image {ImageId} for vehicle {VehicleId}",
                userId, created.VehicleImageId, vehicleId);
            return created.ToDto();
        }

        public async Task<VehicleImageDto> SetPrimaryImageAsync(Guid userId, Guid vehicleId, Guid imageId)
        {
            var image = await _vehicleRepo.GetImageAsync(vehicleId, imageId, userId)
                ?? throw AppException.NotFound("Không tìm thấy ảnh xe.");

            await _vehicleRepo.SetPrimaryImageAsync(vehicleId, imageId);
            image.IsPrimary = true;

            _logger.LogInformation("User {UserId} set vehicle image {ImageId} as primary for vehicle {VehicleId}",
                userId, imageId, vehicleId);
            return image.ToDto();
        }

        public async Task<string> DeleteImageAsync(Guid userId, Guid vehicleId, Guid imageId)
        {
            var vehicle = await _vehicleRepo.GetByIdAsync(vehicleId, userId)
                ?? throw AppException.NotFound(ValidationMessage.Vehicle.NotFound);

            var image = vehicle.VehicleImages
                .SingleOrDefault(existingImage => existingImage.VehicleImageId == imageId)
                ?? throw AppException.NotFound("Không tìm thấy ảnh xe.");

            if (image.IsPrimary)
            {
                var replacement = vehicle.VehicleImages
                    .Where(existingImage => existingImage.VehicleImageId != imageId)
                    .OrderBy(existingImage => existingImage.DisplayOrder)
                    .ThenBy(existingImage => existingImage.UploadedAtUtc)
                    .FirstOrDefault();

                if (replacement is not null)
                {
                    await _vehicleRepo.SetPrimaryImageAsync(vehicleId, replacement.VehicleImageId);
                }
            }

            await _vehicleRepo.DeleteImageAsync(image);
            _logger.LogInformation("User {UserId} deleted vehicle image {ImageId} for vehicle {VehicleId}",
                userId, imageId, vehicleId);
            return image.ImageUrl;
        }

        /// <summary>Xoá mềm — giữ lịch sử vì Booking.VehicleId còn tham chiếu tới xe đã "xoá".</summary>
        /// <remarks>Gọi: IVehicleRepository.GetByIdAsync → UpdateAsync.</remarks>
        private static string? NormalizeOptionalText(string? value)
            => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        public async Task DeleteAsync(Guid userId, Guid vehicleId)
        {
            var vehicle = await _vehicleRepo.GetByIdAsync(vehicleId, userId)
            ?? throw AppException.NotFound(ValidationMessage.Vehicle.NotFound);

            vehicle.IsDeleted = true;
            vehicle.DeletedAtUtc = DateTime.UtcNow;
            vehicle.DeletedByUserId = userId;

            await _vehicleRepo.UpdateAsync(vehicle);
            _logger.LogInformation("User {UserId} deleted vehicle {VehicleId}", userId, vehicleId);
        }
    }
}
