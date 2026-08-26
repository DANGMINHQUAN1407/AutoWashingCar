using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using WashingCar_Common.Constant;
using WashingCar_Common.Exceptions;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_DAL.Repositories
{
    public class VehicleRepository : IVehicleRepository
    {
        private readonly WashingCarDbContext _context;

        public VehicleRepository(WashingCarDbContext context)
        {
            _context = context;
        }

        public async Task<Vehicle> CreateAsync(Vehicle vehicle)
        {
            try
            {
                await _context.Vehicles.AddAsync(vehicle);
                await _context.VehicleOwnershipHistories.AddAsync(new VehicleOwnershipHistory
                {
                    Vehicle = vehicle,
                    UserId = vehicle.UserId,
                    OwnedFromUtc = vehicle.CreatedAtUtc,
                    CreatedAtUtc = DateTime.UtcNow,
                });
                await _context.SaveChangesAsync();
                return vehicle;
            }
            catch (DbUpdateException ex) when (IsLicensePlateUniqueViolation(ex))
            {
                throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);
            }
        }

        public async Task<bool> ExistsLicensePlateAsync(string licensePlate, Guid? excludeId = null)
        {
            return await _context.Vehicles.AnyAsync(
                v => v.LicensePlate == licensePlate.ToUpperInvariant()
                && !v.IsDeleted
                && (excludeId == null || v.VehicleId != excludeId.Value)
            );
        }

        public async Task<Vehicle?> GetByIdAsync(Guid vehicleId, Guid userId)
        {
            return await _context.Vehicles
                .Include(vehicle => vehicle.VehicleImages)
                .Include(vehicle => vehicle.EngineCatalog)
                .Include(vehicle => vehicle.BodyStyleCatalog)
                .Include(vehicle => vehicle.BrandCatalog)
                .FirstOrDefaultAsync(
                    vehicle => vehicle.VehicleId == vehicleId
                        && vehicle.UserId == userId
                        && !vehicle.IsDeleted);
        }

        public async Task<(List<Vehicle> Items, int TotalCount)> GetByUserIdAsync(
            Guid userId, VehicleQuery query, CancellationToken ct = default)
        {
            var vehicles = _context.Vehicles
                .AsNoTracking()
                .Where(vehicle => vehicle.UserId == userId && !vehicle.IsDeleted);

            var totalCount = await vehicles.CountAsync(ct);
            var items = await vehicles
                .Include(vehicle => vehicle.VehicleImages)
                .Include(vehicle => vehicle.EngineCatalog)
                .Include(vehicle => vehicle.BodyStyleCatalog)
                .Include(vehicle => vehicle.BrandCatalog)
                .OrderBy(vehicle => vehicle.CreatedAtUtc)
                .ThenBy(vehicle => vehicle.VehicleId)
                .Skip(query.Skip)
                .Take(query.PageSize)
                .ToListAsync(ct);

            return (items, totalCount);
        }

        public async Task UpdateAsync(Vehicle vehicle)
        {
            try
            {
                _context.Vehicles.Update(vehicle);
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsLicensePlateUniqueViolation(ex))
            {
                throw AppException.Conflict(ValidationMessage.Vehicle.LicensePlateExists);
            }
        }

        private static bool IsLicensePlateUniqueViolation(DbUpdateException exception)
        {
            if (exception.GetBaseException() is not SqlException sqlException)
                return false;

            return sqlException.Number is 2601 or 2627
                && sqlException.Message.Contains("UX_Vehicle_LicensePlate", StringComparison.OrdinalIgnoreCase);
        }

        public async Task<List<VehicleImage>> GetImagesAsync(Guid vehicleId, Guid userId)
        {
            return await _context.VehicleImages
                .AsNoTracking()
                .Where(image => image.VehicleId == vehicleId
                    && image.Vehicle.UserId == userId
                    && !image.Vehicle.IsDeleted)
                .OrderByDescending(image => image.IsPrimary)
                .ThenBy(image => image.DisplayOrder)
                .ThenBy(image => image.UploadedAtUtc)
                .ToListAsync();
        }

        public async Task<VehicleImage?> GetImageAsync(Guid vehicleId, Guid imageId, Guid userId)
        {
            return await _context.VehicleImages
                .FirstOrDefaultAsync(image => image.VehicleImageId == imageId
                    && image.VehicleId == vehicleId
                    && image.Vehicle.UserId == userId
                    && !image.Vehicle.IsDeleted);
        }

        public async Task<VehicleImage> AddImageAsync(VehicleImage image)
        {
            await _context.VehicleImages.AddAsync(image);
            await _context.SaveChangesAsync();
            return image;
        }

        public async Task SetPrimaryImageAsync(Guid vehicleId, Guid imageId)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            await _context.VehicleImages
                .Where(image => image.VehicleId == vehicleId && image.IsPrimary)
                .ExecuteUpdateAsync(setters => setters.SetProperty(image => image.IsPrimary, false));

            await _context.VehicleImages
                .Where(image => image.VehicleId == vehicleId && image.VehicleImageId == imageId)
                .ExecuteUpdateAsync(setters => setters.SetProperty(image => image.IsPrimary, true));

            await transaction.CommitAsync();
        }

        public async Task DeleteImageAsync(VehicleImage image)
        {
            _context.VehicleImages.Remove(image);
            await _context.SaveChangesAsync();
        }
    }
}
