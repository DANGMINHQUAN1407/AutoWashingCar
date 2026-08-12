using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WashingCar_Common.Enum;
using WashingCar_DAL.Data;
using WashingCar_DAL.Entities;

namespace WashingCar_DAL.Seeders;

public static class DataSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider, IConfiguration configuration)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WashingCarDbContext>();

        // Tự động migrate DB khi startup
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(() => db.Database.MigrateAsync());

        // --- BƯỚC 1: TẠO TÀI KHOẢN SUPER ADMIN ---
        await SeedAdminAsync(db, configuration);
    }

    private static async Task SeedAdminAsync(WashingCarDbContext db, IConfiguration configuration)
    {
        var adminEmail = configuration["SuperAdminSettings:Email"];
        var adminPassword = configuration["SuperAdminSettings:Password"];

        if (string.IsNullOrEmpty(adminEmail) || string.IsNullOrEmpty(adminPassword))
            throw new InvalidOperationException("SuperAdminSettings:Email hoặc Password chưa được cấu hình.");

        // Đã có admin rồi thì bỏ qua
        if (await db.Users.AnyAsync(u => u.Email == adminEmail && !u.IsDeleted))
            return;

        var hasher = new PasswordHasher<User>();
        var adminUser = new User
        {
            FullName = "Super Admin",
            Email = adminEmail,
            PhoneNumber = "0900000000",
            Role = UserRole.Admin,
            IsGuest = false,
            IsActive = true,
            IsDeleted = false,
            CreatedAtUtc = DateTime.UtcNow,
            RowVersion = Array.Empty<byte>()
        };
        adminUser.PasswordHash = hasher.HashPassword(adminUser, adminPassword);

        await db.Users.AddAsync(adminUser);
        await db.SaveChangesAsync();
    }
}