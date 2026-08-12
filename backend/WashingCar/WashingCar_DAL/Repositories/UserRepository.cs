using Microsoft.EntityFrameworkCore;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;
using WashingCar_DAL.Interfaces;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_DAL.Repositories;

public class UserRepository : IUserRepository
{
    private readonly WashingCarDbContext _db;

    public UserRepository(WashingCarDbContext db)
    {
        _db = db;
    }

    public async Task<User> CreateAsync(User user)
    {
        await _db.Users.AddAsync(user);
        await _db.SaveChangesAsync();
        return user;
    }

    public async Task<bool> ExistsAsync(string email)
    {
        var normalizedEmail = email.ToUpperInvariant();
        return await _db.Users
            .AnyAsync(u => u.Email == normalizedEmail);
    }

    public async Task<bool> ExistsPhoneAsync(string phone)
        => await _db.Users.AnyAsync(u => u.PhoneNumber == phone && !u.IsDeleted);

    public async Task<User?> GetByPhoneAsync(string phone)
        => await _db.Users.FirstOrDefaultAsync(u => u.PhoneNumber == phone && !u.IsDeleted);

    public async Task<User?> GetByEmailAsync(string email)
    {
        var normalizedEmail = email.ToUpperInvariant();
        return await _db.Users
            .FirstOrDefaultAsync(u => u.Email != null
                && u.Email.ToUpper() == normalizedEmail
                && !u.IsDeleted && u.IsActive);
    }

    public async Task<User?> GetByIdAsync(Guid userId)
    {
        return await _db.Users
            .FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted && u.IsActive);
    }

    public async Task<User?> GetByIdIncludeInactiveAsync(Guid userId)
    {
        return await _db.Users
            .FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted);
    }

    public async Task UpdateAsync(User user)
    {
        _db.Users.Update(user);
        await _db.SaveChangesAsync();
    }

    public async Task<(List<User> Users, int TotalCount)> GetAllPaginatedAsync(UserFilterQuery query)
    {
        var q = _db.Users.AsNoTracking().Where(u => !u.IsDeleted);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var s = query.Search.Trim().ToLower();
            q = q.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(s)) ||
                u.FullName.ToLower().Contains(s) ||
                (u.PhoneNumber != null && u.PhoneNumber.ToLower().Contains(s)));
        }

        if (!string.IsNullOrWhiteSpace(query.PhoneNumber))
        {
            var phone = query.PhoneNumber.Trim();
            q = q.Where(u => u.PhoneNumber != null && u.PhoneNumber.Contains(phone));
        }

        if (!string.IsNullOrWhiteSpace(query.Role))
            q = q.Where(u => u.Role == query.Role);

        if (query.IsActive.HasValue)
            q = q.Where(u => u.IsActive == query.IsActive.Value);

        var totalCount = await q.CountAsync();

        q = query.SortBy?.ToLower() switch
        {
            "fullname"   => query.SortDesc ? q.OrderByDescending(u => u.FullName)     : q.OrderBy(u => u.FullName),
            "role"       => query.SortDesc ? q.OrderByDescending(u => u.Role)         : q.OrderBy(u => u.Role),
            "createdat"  => query.SortDesc ? q.OrderByDescending(u => u.CreatedAtUtc) : q.OrderBy(u => u.CreatedAtUtc),
            _            => query.SortDesc ? q.OrderByDescending(u => u.Email)        : q.OrderBy(u => u.Email),
        };

        var users = await q.Skip(query.Skip).Take(query.PageSize).ToListAsync();

        return (users, totalCount);
    }
}
