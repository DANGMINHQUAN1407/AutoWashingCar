using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_BLL.Interfaces
{
    public interface IVehicleService
    {
        Task<List<VehicleDto>> GetMyVehiclesAsync(Guid userId);
        Task<VehicleDto> GetByIdAsync(Guid userId, Guid vehicleId);
        Task<VehicleDto> CreateAsync(Guid userId, CreateVehicleRequest request);
        Task<VehicleDto> UpdateAsync(Guid userId, Guid vehicleId, UpdateVehicleRequest request);
        Task DeleteAsync(Guid userId, Guid vehicleId);
    }
}