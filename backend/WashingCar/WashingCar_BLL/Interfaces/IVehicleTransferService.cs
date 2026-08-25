using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.VehicleTransfer;

namespace WashingCar_BLL.Interfaces;

public interface IVehicleTransferService
{
    Task<VehicleTransferRequestDto> CreateAsync(
        Guid requesterId,
        CreateVehicleTransferRequest request,
        CancellationToken ct = default);

    Task<PagedResult<VehicleTransferRequestDto>> GetMyRequestsAsync(
        Guid userId,
        VehicleTransferQuery query,
        CancellationToken ct = default);

    Task<VehicleTransferRequestDto> CancelAsync(
        Guid userId,
        Guid requestId,
        CancellationToken ct = default);

    Task<PagedResult<VehicleTransferRequestDto>> GetAdminRequestsAsync(
        Guid adminId,
        VehicleTransferQuery query,
        CancellationToken ct = default);

    Task<VehicleTransferRequestDto> ApproveAsync(
        Guid adminId,
        Guid requestId,
        ReviewVehicleTransferRequest request,
        CancellationToken ct = default);

    Task<VehicleTransferRequestDto> RejectAsync(
        Guid adminId,
        Guid requestId,
        ReviewVehicleTransferRequest request,
        CancellationToken ct = default);

    Task<List<VehicleOwnershipHistoryDto>> GetHistoryAsync(
        Guid adminId,
        Guid vehicleId,
        CancellationToken ct = default);
}
