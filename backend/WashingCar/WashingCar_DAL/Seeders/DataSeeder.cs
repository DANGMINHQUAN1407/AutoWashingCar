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

        // --- BƯỚC 1: SEED MASTER DATA CATALOG XE ---
        await SeedVehicleCatalogsAsync(db);

        // --- BƯỚC 2: TẠO TÀI KHOẢN SUPER ADMIN ---
        await SeedAdminAsync(db, configuration);
    }

    private static async Task SeedVehicleCatalogsAsync(WashingCarDbContext db)
    {
        var now = DateTime.UtcNow;
        var engines = new[]
        {
            (Code: "GASOLINE", Name: "Gasoline", Legacy: (byte)1),
            (Code: "DIESEL", Name: "Diesel", Legacy: (byte)2),
            (Code: "ELECTRIC", Name: "Electric", Legacy: (byte)3),
            (Code: "HYBRID", Name: "Hybrid", Legacy: (byte)4),
        };
        foreach (var seed in engines)
        {
            if (!await db.VehicleEngineCatalogs.AnyAsync(x => x.Code == seed.Code))
            {
                await db.VehicleEngineCatalogs.AddAsync(new VehicleEngineCatalog
                {
                    VehicleEngineCatalogId = Guid.NewGuid(),
                    Code = seed.Code,
                    Name = seed.Name,
                    IsActive = true,
                    LegacyEnumValue = seed.Legacy,
                    CreatedAtUtc = now,
                    RowVersion = [],
                });
            }
        }

        var bodyStyles = new[]
        {
            (Code: "SEDAN", Name: "Sedan", Legacy: (byte)1),
            (Code: "SUV", Name: "SUV", Legacy: (byte)2),
            (Code: "HATCHBACK", Name: "Hatchback", Legacy: (byte)3),
            (Code: "PICKUP", Name: "Pickup", Legacy: (byte)4),
            (Code: "VAN", Name: "Van", Legacy: (byte)5),
            (Code: "MINIVAN", Name: "Minivan", Legacy: (byte)6),
            (Code: "COUPE", Name: "Coupe", Legacy: (byte)7),
            (Code: "CONVERTIBLE", Name: "Convertible", Legacy: (byte)8),
        };
        foreach (var seed in bodyStyles)
        {
            if (!await db.VehicleBodyStyleCatalogs.AnyAsync(x => x.Code == seed.Code))
            {
                await db.VehicleBodyStyleCatalogs.AddAsync(new VehicleBodyStyleCatalog
                {
                    VehicleBodyStyleCatalogId = Guid.NewGuid(),
                    Code = seed.Code,
                    Name = seed.Name,
                    IsActive = true,
                    LegacyEnumValue = seed.Legacy,
                    CreatedAtUtc = now,
                    RowVersion = [],
                });
            }
        }

        await db.SaveChangesAsync();

        await db.Database.ExecuteSqlRawAsync("""
            UPDATE v
            SET v.EngineCatalogId = c.VehicleEngineCatalogId
            FROM Vehicle v
            INNER JOIN VehicleEngineCatalog c ON c.LegacyEnumValue = v.EngineType
            WHERE v.EngineCatalogId IS NULL AND v.EngineType IS NOT NULL;

            UPDATE v
            SET v.BodyStyleCatalogId = c.VehicleBodyStyleCatalogId
            FROM Vehicle v
            INNER JOIN VehicleBodyStyleCatalog c ON c.LegacyEnumValue = v.BodyStyle
            WHERE v.BodyStyleCatalogId IS NULL AND v.BodyStyle IS NOT NULL;
            """);
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