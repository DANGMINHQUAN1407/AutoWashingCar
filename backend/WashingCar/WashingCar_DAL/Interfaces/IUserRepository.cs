using WashingCar_DAL.Entities;
using WashingCar_Domain.DTOs.User;

namespace WashingCar_DAL.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email);
    Task<User?> GetByIdAsync(Guid userId);
    Task<User?> GetByIdIncludeInactiveAsync(Guid userId);

    Task<bool> ExistsAsync(string email);
    Task<bool> ExistsPhoneAsync(string phone);
    Task<User?> GetByPhoneAsync(string phone);
    Task<User> CreateAsync(User user);
    Task       UpdateAsync(User user);

    Task<(List<User> Users, int TotalCount)> GetAllPaginatedAsync(UserFilterQuery query);
}
