using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_DAL.Interfaces
{
    public interface IVehicleRepository
    {
        Task<(List<Vehicle> Items, int TotalCount)> GetByUserIdAsync(Guid userId, VehicleQuery query, CancellationToken ct = default);
        Task<Vehicle?> GetByIdAsync(Guid vehicleId, Guid userId);
        /// <summary>Kiểm tra biển số đã tồn tại trên bất kỳ vehicle active nào.</summary>
        Task<bool> ExistsLicensePlateAsync(string licensePlate, Guid? excludeId = null);
        Task<Vehicle> CreateAsync(Vehicle vehicle);
        Task UpdateAsync(Vehicle vehicle);
        Task<List<VehicleImage>> GetImagesAsync(Guid vehicleId, Guid userId);
        Task<VehicleImage?> GetImageAsync(Guid vehicleId, Guid imageId, Guid userId);
        Task<VehicleImage> AddImageAsync(VehicleImage image);
        Task SetPrimaryImageAsync(Guid vehicleId, Guid imageId);
        Task DeleteImageAsync(VehicleImage image);
    }
}