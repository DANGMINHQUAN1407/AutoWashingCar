using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using WashingCar_Common.Enum;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.VehicleTransfer;

namespace WashingCar_DAL.Repositories;

public class VehicleTransferRepository(WashingCarDbContext db) : IVehicleTransferRepository
{
    private readonly WashingCarDbContext _db = db;

    public Task<Vehicle?> GetVehicleForOwnerAsync(
        Guid vehicleId, Guid ownerId, CancellationToken ct = default)
        => _db.Vehicles
            .Include(v => v.User)
            .FirstOrDefaultAsync(v => v.VehicleId == vehicleId
                && v.UserId == ownerId
                && !v.IsDeleted, ct);

    public Task<Vehicle?> GetActiveVehicleByPlateAsync(
        string canonicalPlate, CancellationToken ct = default)
        => _db.Vehicles
            .Include(v => v.User)
            .FirstOrDefaultAsync(v => v.LicensePlate == canonicalPlate
                && !v.IsDeleted, ct);

    public Task<VehicleTransferRequest?> GetTrackedRequestAsync(
        Guid requestId, CancellationToken ct = default)
        => RequestQuery(tracked: true)
            .FirstOrDefaultAsync(r => r.VehicleTransferRequestId == requestId, ct);

    public Task<bool> HasPendingRequestAsync(Guid vehicleId, CancellationToken ct = default)
        => _db.VehicleTransferRequests.AnyAsync(r => r.VehicleId == vehicleId
            && r.Status == VehicleTransferStatus.Pending, ct);

    public async Task<(List<VehicleTransferRequest> Items, int TotalCount)> GetMyRequestsPagedAsync(
        Guid userId, VehicleTransferQuery query, CancellationToken ct = default)
    {
        var requests = RequestQuery(tracked: false)
            .Where(r => r.FromUserId == userId || r.ToUserId == userId);

        requests = ApplyFilters(requests, query);
        var totalCount = await requests.CountAsync(ct);
        var items = await requests
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, totalCount);
    }

    public async Task<(List<VehicleTransferRequest> Items, int TotalCount)> GetAdminRequestsPagedAsync(
        VehicleTransferQuery query, CancellationToken ct = default)
    {
        var requests = RequestQuery(tracked: false);
        requests = ApplyFilters(requests, query);
        var totalCount = await requests.CountAsync(ct);
        var items = await requests
            .OrderByDescending(r => r.CreatedAtUtc)
            .Skip(query.Skip)
            .Take(query.PageSize)
            .ToListAsync(ct);
        return (items, totalCount);
    }

    public Task<List<VehicleOwnershipHistory>> GetVehicleHistoryAsync(
        Guid vehicleId, CancellationToken ct = default)
        => _db.VehicleOwnershipHistories
            .AsNoTracking()
            .Include(h => h.Vehicle)
            .Include(h => h.User)
            .Where(h => h.VehicleId == vehicleId)
            .OrderByDescending(h => h.OwnedFromUtc)
            .ToListAsync(ct);

    public Task<VehicleOwnershipHistory?> GetCurrentOwnershipAsync(
        Guid vehicleId, CancellationToken ct = default)
        => _db.VehicleOwnershipHistories
            .FirstOrDefaultAsync(h => h.VehicleId == vehicleId && h.OwnedToUtc == null, ct);

    public Task<bool> HasBlockingBookingsAsync(
        Guid vehicleId,
        IReadOnlyCollection<byte> blockingStatuses,
        CancellationToken ct = default)
        => _db.Bookings.AnyAsync(b => b.VehicleId == vehicleId
            && blockingStatuses.Contains(b.BookingStatus), ct);

    public async Task AddRequestAsync(VehicleTransferRequest request, CancellationToken ct = default)
        => await _db.VehicleTransferRequests.AddAsync(request, ct);

    public async Task AddOwnershipHistoryAsync(VehicleOwnershipHistory history, CancellationToken ct = default)
        => await _db.VehicleOwnershipHistories.AddAsync(history, ct);

    public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken ct = default)
        => _db.Database.BeginTransactionAsync(ct);

    public async Task AcquireVehicleTransferLockAsync(Guid vehicleId, CancellationToken ct = default)
    {
        await _db.Database.ExecuteSqlInterpolatedAsync($"""
            DECLARE @result int;
            EXEC @result = sp_getapplock
                @Resource = {"AutoWashingCar:VehicleTransfer:" + vehicleId.ToString("N")},
                @LockMode = N'Exclusive',
                @LockOwner = N'Transaction',
                @LockTimeout = 10000;
            IF @result < 0 THROW 51001, 'Unable to acquire vehicle transfer lock.', 1;
            """, ct);
    }

    public Task SaveChangesAsync(CancellationToken ct = default)
        => _db.SaveChangesAsync(ct);

    private IQueryable<VehicleTransferRequest> RequestQuery(bool tracked)
    {
        var query = _db.VehicleTransferRequests
            .Include(r => r.Vehicle)
            .Include(r => r.FromUser)
            .Include(r => r.ToUser)
            .Include(r => r.ReviewedByUser)
            .AsQueryable();
        return tracked ? query : query.AsNoTracking();
    }

    private static IQueryable<VehicleTransferRequest> ApplyFilters(
        IQueryable<VehicleTransferRequest> query, VehicleTransferQuery filter)
    {
        if (filter.Status.HasValue)
            query = query.Where(r => r.Status == filter.Status.Value);
        if (filter.VehicleId.HasValue)
            query = query.Where(r => r.VehicleId == filter.VehicleId.Value);
        if (filter.ToUserId.HasValue)
            query = query.Where(r => r.ToUserId == filter.ToUserId.Value);
        if (!string.IsNullOrWhiteSpace(filter.LicensePlate))
        {
            var plate = filter.LicensePlate.Trim().ToUpperInvariant();
            query = query.Where(r => r.Vehicle.LicensePlate.Contains(plate));
        }
        return query;
    }
}
