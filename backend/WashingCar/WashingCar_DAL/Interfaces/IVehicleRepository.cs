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
    }
}