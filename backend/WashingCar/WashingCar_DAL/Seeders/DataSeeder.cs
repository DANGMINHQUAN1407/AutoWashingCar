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

        // --- BƯỚC 2: SEED GÓI DỊCH VỤ VÀ ADD-ON ---
        await SeedDefaultServicesAndAddOnsAsync(db);

        // --- BƯỚC 3: TẠO TÀI KHOẢN SUPER ADMIN ---
        await SeedAdminAsync(db, configuration);
    }

    private static async Task SeedVehicleCatalogsAsync(WashingCarDbContext db)
    {
        var now = DateTime.UtcNow;
        var engines = new[]
        {
            (Code: "GASOLINE", Name: "Xăng (Gasoline)", Legacy: (byte)1),
            (Code: "DIESEL", Name: "Dầu diesel (Diesel)", Legacy: (byte)2),
            (Code: "ELECTRIC", Name: "Điện (Electric)", Legacy: (byte)3),
            (Code: "HYBRID", Name: "Hybrid", Legacy: (byte)4),
        };
        foreach (var seed in engines)
        {
            var item = await db.VehicleEngineCatalogs.FirstOrDefaultAsync(x => x.Code == seed.Code);
            if (item is null)
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
            else if (item.Name != seed.Name)
            {
                item.Name = seed.Name;
                item.UpdatedAtUtc = now;
            }
        }

        var bodyStyles = new[]
        {
            (Code: "SEDAN", Name: "Sedan – xe gầm thấp", Legacy: (byte?)1, VehicleType: VehicleType.Car),
            (Code: "SUV", Name: "SUV – xe gầm cao", Legacy: (byte?)2, VehicleType: VehicleType.Car),
            (Code: "HATCHBACK", Name: "Hatchback – xe 5 cửa", Legacy: (byte?)3, VehicleType: VehicleType.Car),
            (Code: "PICKUP", Name: "Pickup – xe bán tải", Legacy: (byte?)4, VehicleType: VehicleType.Car),
            (Code: "VAN", Name: "Van – xe chở khách/hàng", Legacy: (byte?)5, VehicleType: VehicleType.Car),
            (Code: "MINIVAN", Name: "Minivan – xe đa dụng", Legacy: (byte?)6, VehicleType: VehicleType.Car),
            (Code: "COUPE", Name: "Coupe – xe thể thao 2 cửa", Legacy: (byte?)7, VehicleType: VehicleType.Car),
            (Code: "CONVERTIBLE", Name: "Convertible – xe mui trần", Legacy: (byte?)8, VehicleType: VehicleType.Car),
            (Code: "MOTORBIKE_STANDARD", Name: "Xe số", Legacy: (byte?)null, VehicleType: VehicleType.Motorbike),
            (Code: "MOTORBIKE_SCOOTER", Name: "Xe tay ga", Legacy: (byte?)null, VehicleType: VehicleType.Motorbike),
            (Code: "MOTORBIKE_MANUAL", Name: "Xe côn tay", Legacy: (byte?)null, VehicleType: VehicleType.Motorbike),
            (Code: "TRUCK_BOX", Name: "Xe tải thùng", Legacy: (byte?)null, VehicleType: VehicleType.Truck),
            (Code: "TRUCK_DUMP", Name: "Xe tải ben", Legacy: (byte?)null, VehicleType: VehicleType.Truck),
            (Code: "CARGO_TRICYCLE", Name: "Xe ba gác chở hàng", Legacy: (byte?)null, VehicleType: VehicleType.Truck),
        };
        foreach (var seed in bodyStyles)
        {
            var item = await db.VehicleBodyStyleCatalogs.FirstOrDefaultAsync(x => x.Code == seed.Code);
            if (item is null)
            {
                await db.VehicleBodyStyleCatalogs.AddAsync(new VehicleBodyStyleCatalog
                {
                    VehicleBodyStyleCatalogId = Guid.NewGuid(),
                    Code = seed.Code,
                    Name = seed.Name,
                    VehicleType = (byte)seed.VehicleType,
                    IsActive = true,
                    LegacyEnumValue = seed.Legacy,
                    CreatedAtUtc = now,
                    RowVersion = [],
                });
            }
            else
            {
                var changed = false;
                if (item.Name != seed.Name) { item.Name = seed.Name; changed = true; }
                if (item.VehicleType != (byte)seed.VehicleType) { item.VehicleType = (byte)seed.VehicleType; changed = true; }
                if (item.LegacyEnumValue != seed.Legacy) { item.LegacyEnumValue = seed.Legacy; changed = true; }
                if (changed) item.UpdatedAtUtc = now;
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
            INNER JOIN VehicleBodyStyleCatalog c
                ON c.LegacyEnumValue = v.BodyStyle
               AND c.VehicleType = v.VehicleType
            WHERE v.BodyStyleCatalogId IS NULL AND v.BodyStyle IS NOT NULL;
            """);
    }

    private static async Task SeedDefaultServicesAndAddOnsAsync(WashingCarDbContext db)
    {
        var now = DateTime.UtcNow;

        // 1. Cập nhật gói COMBO TOÀN DIỆN thành Premium (nếu có)
        var combo = await db.ServiceCatalogItems.FirstOrDefaultAsync(s => s.ServiceName.Contains("COMBO TOÀN DIỆN") || s.ServiceName.Contains("ULTIMATE COMBO"));
        if (combo != null && combo.ServicePackageType != (byte)ServicePackageType.Premium)
        {
            combo.ServicePackageType = (byte)ServicePackageType.Premium;
        }

        // 2. Tạo các dịch vụ Add-on mẫu (ServicePackageType = 2)
        var addOns = new[]
        {
            (Name: "Tẩy nhựa đường & Bụi sơn", Price: 50000m, Duration: (short)15, Desc: "Xử lý sạch các vết nhựa đường bám dính trên bề mặt sơn xe."),
            (Name: "Khử mùi & Diệt khuẩn Nano Bạc", Price: 40000m, Duration: (short)10, Desc: "Xịt sương Nano khử sạch mùi ẩm mốc, thuốc lá trong khoang lái."),
            (Name: "Tẩy ố kính lái & Gương", Price: 60000m, Duration: (short)15, Desc: "Tẩy sạch cặn canxi, ố mốc kính giúp tầm nhìn trong suốt khi đi mưa."),
            (Name: "Dưỡng bóng lốp & Nhựa nhám", Price: 30000m, Duration: (short)10, Desc: "Phủ dung dịch bảo dưỡng giúp lốp và phần nhựa nhám đen bóng như mới."),
        };

        var addOnEntities = new List<ServiceCatalogItem>();
        foreach (var a in addOns)
        {
            var existing = await db.ServiceCatalogItems.FirstOrDefaultAsync(s => s.ServiceName == a.Name);
            if (existing is null)
            {
                existing = new ServiceCatalogItem
                {
                    ServiceCatalogItemId = Guid.NewGuid(),
                    ServiceName = a.Name,
                    Description = a.Desc,
                    BasePrice = a.Price,
                    DurationMinutes = a.Duration,
                    ServicePackageType = (byte)ServicePackageType.AddOn,
                    ServiceNodeType = (byte)ServiceNodeType.Leaf,
                    IsActive = true,
                    CreatedAtUtc = now,
                };
                await db.ServiceCatalogItems.AddAsync(existing);
            }
            addOnEntities.Add(existing);
        }

        await db.SaveChangesAsync();

        // 3. Gán các dịch vụ Add-on vào tất cả các chi nhánh hiện có
        var branches = await db.Branches.Where(b => b.IsActive).ToListAsync();
        foreach (var branch in branches)
        {
            foreach (var addon in addOnEntities)
            {
                var hasBranchService = await db.BranchServices.AnyAsync(bs => bs.BranchId == branch.BranchId && bs.ServiceCatalogItemId == addon.ServiceCatalogItemId);
                if (!hasBranchService)
                {
                    await db.BranchServices.AddAsync(new BranchService
                    {
                        BranchId = branch.BranchId,
                        ServiceCatalogItemId = addon.ServiceCatalogItemId,
                        IsActive = true,
                        AddedAtUtc = now,
                    });
                }
            }
        }

        await db.SaveChangesAsync();
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