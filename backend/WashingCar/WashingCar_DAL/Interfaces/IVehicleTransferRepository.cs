using Microsoft.EntityFrameworkCore.Storage;
using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.VehicleTransfer;

namespace WashingCar_DAL.Interfaces;

public interface IVehicleTransferRepository
{
    Task<Vehicle?> GetVehicleForOwnerAsync(Guid vehicleId, Guid ownerId, CancellationToken ct = default);
    Task<Vehicle?> GetActiveVehicleByPlateAsync(string canonicalPlate, CancellationToken ct = default);
    Task<VehicleTransferRequest?> GetTrackedRequestAsync(Guid requestId, CancellationToken ct = default);
    Task<bool> HasPendingRequestAsync(Guid vehicleId, CancellationToken ct = default);
    Task<(List<VehicleTransferRequest> Items, int TotalCount)> GetMyRequestsPagedAsync(Guid userId, VehicleTransferQuery query, CancellationToken ct = default);
    Task<(List<VehicleTransferRequest> Items, int TotalCount)> GetAdminRequestsPagedAsync(VehicleTransferQuery query, CancellationToken ct = default);
    Task<List<VehicleOwnershipHistory>> GetVehicleHistoryAsync(Guid vehicleId, CancellationToken ct = default);
    Task<VehicleOwnershipHistory?> GetCurrentOwnershipAsync(Guid vehicleId, CancellationToken ct = default);
    Task<bool> HasBlockingBookingsAsync(Guid vehicleId, IReadOnlyCollection<byte> blockingStatuses, CancellationToken ct = default);
    Task AddRequestAsync(VehicleTransferRequest request, CancellationToken ct = default);
    Task AddOwnershipHistoryAsync(VehicleOwnershipHistory history, CancellationToken ct = default);
    Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default);
    Task AcquireVehicleTransferLockAsync(Guid vehicleId, CancellationToken ct = default);
    Task SaveChangesAsync(CancellationToken ct = default);
}
