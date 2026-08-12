using Microsoft.Extensions.Logging;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Mappers;
using WashingCar_Common.Constant;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_BLL.Services
{
    public class VehicleService : IVehicleService
    {
        private readonly IVehicleRepository _vehicleRepo;
        private readonly ILogger<VehicleService> _logger;

        public VehicleService(IVehicleRepository vehicleRepo, ILogger<VehicleService> logger)
        {
            _vehicleRepo = vehicleRepo;
            _logger = logger;
        }

        /// <summary>Danh sách xe (chưa xoá mềm) của khách đang đăng nhập.</summary>
        /// <remarks>Gọi: IVehicleRepository.GetByUserIdAsync.</remarks>
        public async Task<List<VehicleDto>> GetMyVehiclesAsync(Guid userId)
        {
            var vehicles = await _vehicleRepo.GetByUserIdAsync(userId);
            return vehicles.Select(v => v.ToDto()).ToList();
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
            var plate = request.LicensePlate.ToUpperInvariant();

            if (await _vehicleRepo.ExistsLicensePlateAsync(plate, userId))
                throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);
            var vehicle = new Vehicle
            {
                UserId = userId,
                LicensePlate = plate,
                VehicleType = (byte)request.VehicleType,
                Brand = request.Brand,
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

            var plate = request.LicensePlate.ToUpperInvariant();

            if (await _vehicleRepo.ExistsLicensePlateAsync(plate, userId, excludeId: vehicleId))
                throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);

            vehicle.LicensePlate = plate;
            vehicle.VehicleType = (byte)request.VehicleType;
            vehicle.Brand = request.Brand;

            await _vehicleRepo.UpdateAsync(vehicle);
            _logger.LogInformation("User {UserId} updated vehicle {VehicleId}", userId, vehicleId);
            return vehicle.ToDto();

        }

        /// <summary>Xoá mềm — giữ lịch sử vì Booking.VehicleId còn tham chiếu tới xe đã "xoá".</summary>
        /// <remarks>Gọi: IVehicleRepository.GetByIdAsync → UpdateAsync.</remarks>
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
