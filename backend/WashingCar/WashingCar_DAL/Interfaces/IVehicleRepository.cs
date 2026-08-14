using WashingCar_DAL.Entities;
namespace WashingCar_DAL.Interfaces
{
    public interface IVehicleRepository
    {
        Task<List<Vehicle>> GetByUserIdAsync(Guid userId);
        Task<Vehicle?> GetByIdAsync(Guid vehicleId, Guid userId);
        Task<bool> ExistsLicensePlateAsync(string licensePlate, Guid userId, Guid? excludeId = null);
        Task<Vehicle> CreateAsync(Vehicle vehicle);
        Task UpdateAsync(Vehicle vehicle);
        Task<List<VehicleImage>> GetImagesAsync(Guid vehicleId, Guid userId);
        Task<VehicleImage?> GetImageAsync(Guid vehicleId, Guid imageId, Guid userId);
        Task<VehicleImage> AddImageAsync(VehicleImage image);
        Task SetPrimaryImageAsync(Guid vehicleId, Guid imageId);
        Task DeleteImageAsync(VehicleImage image);
    }
}