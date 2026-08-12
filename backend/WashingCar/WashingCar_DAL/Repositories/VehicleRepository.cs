using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;

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
            await _context.Vehicles.AddAsync(vehicle);
            await _context.SaveChangesAsync();
            return vehicle;
        }

        public async Task<bool> ExistsLicensePlateAsync(string licensePlate, Guid userId, Guid? excludeId = null)
        {
            return await _context.Vehicles.AnyAsync(
                v => v.LicensePlate == licensePlate.ToUpperInvariant()
                && v.UserId == userId
                && !v.IsDeleted
                &&(excludeId == null || v.VehicleId != excludeId.Value)
            );
        }

        public async Task<Vehicle?> GetByIdAsync(Guid vehicleId, Guid userId)
        {
            return await _context.Vehicles.FirstOrDefaultAsync(
                v => v.VehicleId == vehicleId && v.UserId == userId && !v.IsDeleted
            );
        }

        public async Task<List<Vehicle>> GetByUserIdAsync(Guid userId)
        {
            return await _context.Vehicles
            .AsNoTracking()
            .Where(v => v.UserId == userId && !v.IsDeleted)
            .OrderBy(v => v.CreatedAtUtc)
            .ToListAsync();
        }

        public async Task UpdateAsync(Vehicle vehicle)
        {
            _context.Vehicles.Update(vehicle);
            await _context.SaveChangesAsync();
        }
    }
}