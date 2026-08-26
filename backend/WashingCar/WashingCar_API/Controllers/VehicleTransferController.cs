using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.VehicleTransfer;

namespace WashingCar_API.Controllers;

[Route("api/vehicle-transfers")]
public class VehicleTransferController(IVehicleTransferService transferService) : BaseApiController
{
    private readonly IVehicleTransferService _transferService = transferService;

    [HttpPost]
    [Authorize(Roles = UserRole.Customer)]
    public async Task<IActionResult> Create(
        [FromBody] CreateVehicleTransferRequest request,
        CancellationToken ct)
    {
        var result = await _transferService.CreateAsync(CurrentUserId, request, ct);
        return Created(nameof(GetMine), null, result, "Đã gửi yêu cầu chuyển nhượng, chờ Admin phê duyệt");
    }

    [HttpGet("mine")]
    [Authorize(Roles = UserRole.Customer)]
    public async Task<IActionResult> GetMine(
        [FromQuery] VehicleTransferQuery query,
        CancellationToken ct)
    {
        var result = await _transferService.GetMyRequestsAsync(CurrentUserId, query, ct);
        return Paged(result);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = UserRole.Customer)]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _transferService.CancelAsync(CurrentUserId, id, ct);
        return Success(result, "Đã hủy yêu cầu chuyển nhượng");
    }

    [HttpGet("admin")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetForAdmin(
        [FromQuery] VehicleTransferQuery query,
        CancellationToken ct)
    {
        var result = await _transferService.GetAdminRequestsAsync(CurrentUserId, query, ct);
        return Paged(result);
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Approve(
        Guid id,
        [FromBody] ReviewVehicleTransferRequest request,
        CancellationToken ct)
    {
        var result = await _transferService.ApproveAsync(CurrentUserId, id, request, ct);
        return Success(result, "Đã phê duyệt chuyển nhượng xe");
    }

    [HttpPost("{id:guid}/reject")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> Reject(
        Guid id,
        [FromBody] ReviewVehicleTransferRequest request,
        CancellationToken ct)
    {
        var result = await _transferService.RejectAsync(CurrentUserId, id, request, ct);
        return Success(result, "Đã từ chối yêu cầu chuyển nhượng xe");
    }

    [HttpGet("vehicles/{vehicleId:guid}/history")]
    [Authorize(Roles = UserRole.Admin)]
    public async Task<IActionResult> GetHistory(Guid vehicleId, CancellationToken ct)
    {
        var result = await _transferService.GetHistoryAsync(CurrentUserId, vehicleId, ct);
        return Success(result);
    }
}
