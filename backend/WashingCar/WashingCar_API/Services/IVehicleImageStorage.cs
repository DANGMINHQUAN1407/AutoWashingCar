using Microsoft.AspNetCore.Http;

namespace WashingCar_API.Services;

public interface IVehicleImageStorage
{
    Task<string> SaveAsync(Guid vehicleId, IFormFile file, CancellationToken cancellationToken = default);
    Task DeleteAsync(string imageUrl, CancellationToken cancellationToken = default);
}
