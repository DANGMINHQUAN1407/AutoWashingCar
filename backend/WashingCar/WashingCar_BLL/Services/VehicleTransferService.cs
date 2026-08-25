using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WashingCar_BLL.Interfaces;
using WashingCar_BLL.Policies;
using WashingCar_Common.Constant;
using WashingCar_Common.Enum;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs;
using WashingCar_Domain.DTOs.VehicleTransfer;

namespace WashingCar_BLL.Services;

public class VehicleTransferService(
    IVehicleTransferRepository transferRepo,
    IUserRepository userRepo) : IVehicleTransferService
{
    private static readonly byte[] BlockingBookingStatuses =
    [
        BookingStatus.Pending,
        BookingStatus.Confirmed,
        BookingStatus.CheckedIn,
        BookingStatus.InProgress
    ];

    public async Task<VehicleTransferRequestDto> CreateAsync(
        Guid requesterId,
        CreateVehicleTransferRequest request,
        CancellationToken ct = default)
    {
        var requester = await userRepo.GetByIdAsync(requesterId)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.TargetUserNotFound);
        EnsureActiveCustomer(requester);

        if (!Enum.IsDefined(typeof(VehicleType), request.VehicleType))
            throw AppException.BadRequest("Loại phương tiện không hợp lệ.");

        var canonicalPlate = LicensePlatePolicy.Normalize(
            request.LicensePlate, (VehicleType)request.VehicleType);
        var vehicle = await transferRepo.GetActiveVehicleByPlateAsync(canonicalPlate, ct)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.VehicleNotFound);

        if (vehicle.UserId == requesterId)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.CannotTransferToSelf);

        await using var transaction = await transferRepo.BeginTransactionAsync(ct);
        await transferRepo.AcquireVehicleTransferLockAsync(vehicle.VehicleId, ct);

        // Reload after acquiring the lock so owner/pending checks are serialized.
        vehicle = await transferRepo.GetActiveVehicleByPlateAsync(canonicalPlate, ct)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.VehicleNotFound);
        if (vehicle.UserId == requesterId)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.CannotTransferToSelf);
        if (await transferRepo.HasPendingRequestAsync(vehicle.VehicleId, ct))
            throw AppException.Conflict(ValidationMessage.VehicleTransfer.PendingRequestExists);

        var transfer = new VehicleTransferRequest
        {
            VehicleId = vehicle.VehicleId,
            FromUserId = vehicle.UserId,
            ToUserId = requesterId,
            Status = VehicleTransferStatus.Pending,
            Reason = NormalizeNote(request.Reason),
            CreatedAtUtc = DateTime.UtcNow,
            Vehicle = vehicle,
            FromUser = vehicle.User,
            ToUser = requester,
        };

        try
        {
            await transferRepo.AddRequestAsync(transfer, ct);
            await transferRepo.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
        }
        catch (DbUpdateException ex) when (IsPendingUniqueViolation(ex))
        {
            throw AppException.Conflict(ValidationMessage.VehicleTransfer.PendingRequestExists);
        }

        return ToDto(transfer, adminView: false, viewerId: requesterId);
    }

    public async Task<PagedResult<VehicleTransferRequestDto>> GetMyRequestsAsync(
        Guid userId,
        VehicleTransferQuery query,
        CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);
        EnsureActiveCustomer(user);

        var (items, totalCount) = await transferRepo.GetMyRequestsPagedAsync(userId, query, ct);
        return new PagedResult<VehicleTransferRequestDto>
        {
            Items = items.Select(r => ToDto(r, adminView: false, viewerId: userId)).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize,
        };
    }

    public async Task<VehicleTransferRequestDto> CancelAsync(
        Guid userId,
        Guid requestId,
        CancellationToken ct = default)
    {
        var user = await userRepo.GetByIdAsync(userId)
            ?? throw AppException.NotFound(ValidationMessage.Common.UserNotFound);
        EnsureActiveCustomer(user);

        await using var transaction = await transferRepo.BeginTransactionAsync(ct);
        var initialTransfer = await transferRepo.GetTrackedRequestAsync(requestId, ct)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.RequestNotFound);
        await transferRepo.AcquireVehicleTransferLockAsync(initialTransfer.VehicleId, ct);

        var transfer = await transferRepo.GetTrackedRequestAsync(requestId, ct)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.RequestNotFound);
        if (transfer.ToUserId != userId)
            throw AppException.NotFound(ValidationMessage.VehicleTransfer.RequestNotFound);
        if (transfer.Status != VehicleTransferStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.CannotCancelNonPending);

        transfer.Status = VehicleTransferStatus.Cancelled;
        transfer.ReviewedByUserId = userId;
        transfer.ReviewedAtUtc = DateTime.UtcNow;
        transfer.ReviewNote = "Yêu cầu được hủy bởi chủ xe mới.";

        await transferRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(transfer, adminView: false, viewerId: userId);
    }

    public async Task<PagedResult<VehicleTransferRequestDto>> GetAdminRequestsAsync(
        Guid adminId,
        VehicleTransferQuery query,
        CancellationToken ct = default)
    {
        await RequireAdminAsync(adminId);
        var (items, totalCount) = await transferRepo.GetAdminRequestsPagedAsync(query, ct);
        return new PagedResult<VehicleTransferRequestDto>
        {
            Items = items.Select(r => ToDto(r, adminView: true, viewerId: null)).ToList(),
            TotalCount = totalCount,
            PageNumber = query.Page,
            PageSize = query.PageSize,
        };
    }

    public Task<VehicleTransferRequestDto> ApproveAsync(
        Guid adminId,
        Guid requestId,
        ReviewVehicleTransferRequest request,
        CancellationToken ct = default)
        => ReviewAsync(adminId, requestId, request, approve: true, ct);

    public Task<VehicleTransferRequestDto> RejectAsync(
        Guid adminId,
        Guid requestId,
        ReviewVehicleTransferRequest request,
        CancellationToken ct = default)
        => ReviewAsync(adminId, requestId, request, approve: false, ct);

    public async Task<List<VehicleOwnershipHistoryDto>> GetHistoryAsync(
        Guid adminId,
        Guid vehicleId,
        CancellationToken ct = default)
    {
        await RequireAdminAsync(adminId);
        var history = await transferRepo.GetVehicleHistoryAsync(vehicleId, ct);
        if (history.Count == 0)
            throw AppException.NotFound(ValidationMessage.VehicleTransfer.VehicleNotFound);

        return history.Select(h => new VehicleOwnershipHistoryDto
        {
            VehicleOwnershipHistoryId = h.VehicleOwnershipHistoryId,
            VehicleId = h.VehicleId,
            LicensePlate = h.Vehicle.LicensePlate,
            UserId = h.UserId,
            UserName = h.User.FullName,
            OwnedFromUtc = h.OwnedFromUtc,
            OwnedToUtc = h.OwnedToUtc,
            VehicleTransferRequestId = h.VehicleTransferRequestId,
            CreatedAtUtc = h.CreatedAtUtc,
        }).ToList();
    }

    private async Task<VehicleTransferRequestDto> ReviewAsync(
        Guid adminId,
        Guid requestId,
        ReviewVehicleTransferRequest review,
        bool approve,
        CancellationToken ct)
    {
        await RequireAdminAsync(adminId);
        await using var transaction = await transferRepo.BeginTransactionAsync(ct);

        var initialTransfer = await transferRepo.GetTrackedRequestAsync(requestId, ct)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.RequestNotFound);
        await transferRepo.AcquireVehicleTransferLockAsync(initialTransfer.VehicleId, ct);

        var transfer = await transferRepo.GetTrackedRequestAsync(requestId, ct)
            ?? throw AppException.NotFound(ValidationMessage.VehicleTransfer.RequestNotFound);
        if (transfer.Status != VehicleTransferStatus.Pending)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.RequestNotPending);

        var vehicle = transfer.Vehicle;
        var target = transfer.ToUser;
        if (vehicle.IsDeleted)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.VehicleNotFound);
        if (vehicle.UserId != transfer.FromUserId)
            throw AppException.Conflict(ValidationMessage.VehicleTransfer.RequestNotPending);
        EnsureActiveCustomer(target);

        if (!approve)
        {
            var note = NormalizeNote(review.ReviewNote);
            if (note is null)
                throw AppException.BadRequest(ValidationMessage.VehicleTransfer.NoteRequiredForReject);

            transfer.Status = VehicleTransferStatus.Rejected;
            transfer.ReviewNote = note;
            transfer.ReviewedByUserId = adminId;
            transfer.ReviewedAtUtc = DateTime.UtcNow;
        }
        else
        {
            if (await transferRepo.HasBlockingBookingsAsync(
                    vehicle.VehicleId, BlockingBookingStatuses, ct))
            {
                throw AppException.Conflict(ValidationMessage.VehicleTransfer.VehicleHasBlockingBookings);
            }

            var currentOwnership = await transferRepo.GetCurrentOwnershipAsync(vehicle.VehicleId, ct)
                ?? throw AppException.Conflict(ValidationMessage.VehicleTransfer.CurrentOwnershipNotFound);
            if (currentOwnership.UserId != transfer.FromUserId)
                throw AppException.Conflict(ValidationMessage.VehicleTransfer.RequestNotPending);

            var now = DateTime.UtcNow;
            currentOwnership.OwnedToUtc = now;
            vehicle.UserId = transfer.ToUserId;
            transfer.Status = VehicleTransferStatus.Approved;
            transfer.ReviewNote = NormalizeNote(review.ReviewNote);
            transfer.ReviewedByUserId = adminId;
            transfer.ReviewedAtUtc = now;

            await transferRepo.AddOwnershipHistoryAsync(new VehicleOwnershipHistory
            {
                VehicleId = vehicle.VehicleId,
                UserId = transfer.ToUserId,
                OwnedFromUtc = now,
                OwnedToUtc = null,
                VehicleTransferRequestId = transfer.VehicleTransferRequestId,
                RecordedByUserId = adminId,
                CreatedAtUtc = now,
            }, ct);
        }

        await transferRepo.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return ToDto(transfer, adminView: true, viewerId: null);
    }

    private async Task<User> RequireAdminAsync(Guid adminId)
    {
        var admin = await userRepo.GetByIdAsync(adminId)
            ?? throw AppException.Forbidden(ValidationMessage.VehicleTransfer.OnlyAdminCanReview);
        if (admin.Role != UserRole.Admin || !admin.IsActive || admin.IsDeleted)
            throw AppException.Forbidden(ValidationMessage.VehicleTransfer.OnlyAdminCanReview);
        return admin;
    }

    private static void EnsureActiveCustomer(User user)
    {
        if (user.Role != UserRole.Customer)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.TargetMustBeCustomer);
        if (!user.IsActive || user.IsDeleted)
            throw AppException.BadRequest(ValidationMessage.VehicleTransfer.TargetInactive);
    }

    private static string? NormalizeNote(string? note)
        => string.IsNullOrWhiteSpace(note) ? null : note.Trim();

    private static bool IsPendingUniqueViolation(DbUpdateException exception)
        => exception.GetBaseException() is SqlException sqlException
            && sqlException.Number is 2601 or 2627
            && sqlException.Message.Contains(
                "UX_VehicleTransferRequest_PendingVehicle", StringComparison.OrdinalIgnoreCase);

    private static VehicleTransferRequestDto ToDto(
        VehicleTransferRequest request, bool adminView, Guid? viewerId)
        => new()
        {
            VehicleTransferRequestId = request.VehicleTransferRequestId,
            VehicleId = request.VehicleId,
            LicensePlate = request.Vehicle.LicensePlate,
            VehicleType = request.Vehicle.VehicleType,
            Status = request.Status,
            FromUserId = adminView ? request.FromUserId : null,
            FromUserName = adminView ? request.FromUser.FullName : null,
            ToUserId = request.ToUserId,
            ToUserName = adminView || request.ToUserId == viewerId
                ? request.ToUser.FullName
                : null,
            Reason = request.Reason,
            ReviewNote = request.ReviewNote,
            ReviewedByUserId = adminView ? request.ReviewedByUserId : null,
            ReviewedByName = adminView ? request.ReviewedByUser?.FullName : null,
            CreatedAtUtc = request.CreatedAtUtc,
            ReviewedAtUtc = request.ReviewedAtUtc,
        };
}
