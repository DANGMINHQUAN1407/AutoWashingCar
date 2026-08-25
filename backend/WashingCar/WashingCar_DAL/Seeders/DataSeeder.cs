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

        // --- BƯỚC 3: BACKFILL BẢNG GIÁ THEO LOẠI XE/ĐỘNG CƠ ---
        await SeedServiceVehiclePricingAsync(db);

        // --- BƯỚC 4: SEED HẠNG THÀNH VIÊN VÀ QUYỀN LỢI ---
        await SeedTiersAndBenefitsAsync(db);

        // --- BƯỚC 5: TẠO TÀI KHOẢN SUPER ADMIN ---
        await SeedAdminAsync(db, configuration);
    }

    private static async Task SeedVehicleCatalogsAsync(WashingCarDbContext db)
    {
        var now = DateTime.UtcNow;
        await EnsureVehicleBrandCatalogSchemaAsync(db);
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

        var brands = new[]
        {
            (Code: "TOYOTA", Name: "Toyota", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "HONDA", Name: "Honda", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "HYUNDAI", Name: "Hyundai", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "KIA", Name: "Kia", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "MAZDA", Name: "Mazda", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "FORD", Name: "Ford", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "MITSUBISHI", Name: "Mitsubishi", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "NISSAN", Name: "Nissan", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "SUZUKI", Name: "Suzuki", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "VINFAST", Name: "VinFast", VehicleType: VehicleType.Car, IsLuxury: false),
            (Code: "MERCEDES_BENZ", Name: "Mercedes-Benz", VehicleType: VehicleType.Car, IsLuxury: true),
            (Code: "BMW", Name: "BMW", VehicleType: VehicleType.Car, IsLuxury: true),
            (Code: "AUDI", Name: "Audi", VehicleType: VehicleType.Car, IsLuxury: true),
            (Code: "PORSCHE", Name: "Porsche", VehicleType: VehicleType.Car, IsLuxury: true),
            (Code: "LEXUS", Name: "Lexus", VehicleType: VehicleType.Car, IsLuxury: true),
            (Code: "MOTORBIKE_HONDA", Name: "Honda", VehicleType: VehicleType.Motorbike, IsLuxury: false),
            (Code: "MOTORBIKE_YAMAHA", Name: "Yamaha", VehicleType: VehicleType.Motorbike, IsLuxury: false),
            (Code: "MOTORBIKE_SUZUKI", Name: "Suzuki", VehicleType: VehicleType.Motorbike, IsLuxury: false),
            (Code: "MOTORBIKE_PIAGGIO", Name: "Piaggio", VehicleType: VehicleType.Motorbike, IsLuxury: false),
            (Code: "MOTORBIKE_VESPA", Name: "Vespa", VehicleType: VehicleType.Motorbike, IsLuxury: false),
            (Code: "TRUCK_THACO", Name: "Thaco", VehicleType: VehicleType.Truck, IsLuxury: false),
            (Code: "TRUCK_HINO", Name: "Hino", VehicleType: VehicleType.Truck, IsLuxury: false),
            (Code: "TRUCK_ISUZU", Name: "Isuzu", VehicleType: VehicleType.Truck, IsLuxury: false),
            (Code: "TRUCK_HYUNDAI", Name: "Hyundai", VehicleType: VehicleType.Truck, IsLuxury: false),
            (Code: "TRUCK_SUZUKI", Name: "Suzuki", VehicleType: VehicleType.Truck, IsLuxury: false),
        };
        foreach (var seed in brands)
        {
            var item = await db.VehicleBrandCatalogs.FirstOrDefaultAsync(x => x.Code == seed.Code);
            if (item is null)
            {
                await db.VehicleBrandCatalogs.AddAsync(new VehicleBrandCatalog
                {
                    VehicleBrandCatalogId = Guid.NewGuid(),
                    Code = seed.Code,
                    Name = seed.Name,
                    VehicleType = (byte)seed.VehicleType,
                    IsActive = true,
                    IsLuxury = seed.IsLuxury,
                    CreatedAtUtc = now,
                    RowVersion = [],
                });
            }
            else
            {
                var changed = false;
                if (item.Name != seed.Name) { item.Name = seed.Name; changed = true; }
                if (item.VehicleType != (byte)seed.VehicleType) { item.VehicleType = (byte)seed.VehicleType; changed = true; }
                if (item.IsLuxury != seed.IsLuxury) { item.IsLuxury = seed.IsLuxury; changed = true; }
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

            UPDATE v
            SET v.BrandCatalogId = c.VehicleBrandCatalogId,
                v.Brand = c.Name
            FROM Vehicle v
            INNER JOIN VehicleBrandCatalog c
                ON v.VehicleType = c.VehicleType
               AND (
                    UPPER(REPLACE(REPLACE(LTRIM(RTRIM(v.Brand)), ' ', '_'), '-', '_')) = c.Code
                    OR UPPER(LTRIM(RTRIM(v.Brand))) = UPPER(c.Name)
               )
            WHERE v.BrandCatalogId IS NULL AND v.Brand IS NOT NULL;
            """);
    }

    private static async Task EnsureVehicleBrandCatalogSchemaAsync(WashingCarDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync("""
            IF OBJECT_ID('dbo.VehicleBrandCatalog', 'U') IS NULL
            BEGIN
                CREATE TABLE [dbo].[VehicleBrandCatalog] (
                    [VehicleBrandCatalogId] UNIQUEIDENTIFIER NOT NULL DEFAULT (newsequentialid()),
                    [Code] VARCHAR(50) NOT NULL,
                    [Name] NVARCHAR(100) NOT NULL,
                    [IsActive] BIT NOT NULL CONSTRAINT [DF_VehicleBrandCatalog_IsActive] DEFAULT ((1)),
                    [VehicleType] TINYINT NOT NULL CONSTRAINT [DF_VehicleBrandCatalog_VehicleType] DEFAULT ((2)),
                    [IsLuxury] BIT NOT NULL CONSTRAINT [DF_VehicleBrandCatalog_IsLuxury] DEFAULT ((0)),
                    [CreatedAtUtc] DATETIME2(3) NOT NULL CONSTRAINT [DF_VehicleBrandCatalog_CreatedAtUtc] DEFAULT (sysutcdatetime()),
                    [UpdatedAtUtc] DATETIME2(3) NULL,
                    [RowVersion] ROWVERSION NOT NULL,
                    CONSTRAINT [PK_VehicleBrandCatalog] PRIMARY KEY CLUSTERED ([VehicleBrandCatalogId] ASC)
                );
            END;

            IF COL_LENGTH('dbo.VehicleBrandCatalog', 'VehicleType') IS NULL
                ALTER TABLE [dbo].[VehicleBrandCatalog] ADD [VehicleType] TINYINT NOT NULL CONSTRAINT [DF_VehicleBrandCatalog_VehicleType] DEFAULT ((2));

            IF COL_LENGTH('dbo.Vehicle', 'BrandCatalogId') IS NULL
                ALTER TABLE [dbo].[Vehicle] ADD [BrandCatalogId] UNIQUEIDENTIFIER NULL;

            IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_VehicleBrandCatalog_Name' AND object_id = OBJECT_ID('dbo.VehicleBrandCatalog'))
                DROP INDEX [UQ_VehicleBrandCatalog_Name] ON [dbo].[VehicleBrandCatalog];

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_VehicleBrandCatalog_Code' AND object_id = OBJECT_ID('dbo.VehicleBrandCatalog'))
                CREATE UNIQUE INDEX [UQ_VehicleBrandCatalog_Code] ON [dbo].[VehicleBrandCatalog] ([Code] ASC);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VehicleBrandCatalog_VehicleType' AND object_id = OBJECT_ID('dbo.VehicleBrandCatalog'))
                CREATE INDEX [IX_VehicleBrandCatalog_VehicleType] ON [dbo].[VehicleBrandCatalog] ([VehicleType] ASC);

            IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Vehicle_BrandCatalogId' AND object_id = OBJECT_ID('dbo.Vehicle'))
                CREATE INDEX [IX_Vehicle_BrandCatalogId] ON [dbo].[Vehicle] ([BrandCatalogId] ASC);

            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Vehicle_BrandCatalog')
                ALTER TABLE [dbo].[Vehicle] WITH CHECK ADD CONSTRAINT [FK_Vehicle_BrandCatalog]
                    FOREIGN KEY([BrandCatalogId]) REFERENCES [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId]);
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

    private static async Task SeedServiceVehiclePricingAsync(WashingCarDbContext db)
    {
        var services = await db.ServiceCatalogItems
            .Where(s => s.IsActive && s.ServiceNodeType == (byte)ServiceNodeType.Leaf)
            .ToListAsync();

        foreach (var service in services)
        {
            var targetVehicleType = service.VehicleType.HasValue ? (VehicleType)service.VehicleType.Value : VehicleType.Car;
            await EnsurePricingRuleAsync(db, service, targetVehicleType, null, service.BasePrice, service.DurationMinutes);
        }

        await db.SaveChangesAsync();
    }

    private static async Task EnsurePricingRuleAsync(
        WashingCarDbContext db,
        ServiceCatalogItem service,
        VehicleType vehicleType,
        Guid? engineCatalogId,
        decimal unitPrice,
        short durationMinutes)
    {
        var exists = await db.ServiceVehiclePricings.AnyAsync(x =>
            x.ServiceCatalogItemId == service.ServiceCatalogItemId
            && x.VehicleType == vehicleType
            && x.EngineCatalogId == engineCatalogId);

        if (exists)
            return;

        await db.ServiceVehiclePricings.AddAsync(new ServiceVehiclePricing
        {
            ServiceVehiclePricingId = Guid.NewGuid(),
            ServiceCatalogItemId = service.ServiceCatalogItemId,
            VehicleType = vehicleType,
            EngineCatalogId = engineCatalogId,
            UnitPrice = unitPrice,
            DurationMinutes = durationMinutes,
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
        });
    }

    private static decimal ScalePrice(decimal value, decimal multiplier)
        => Math.Max(1m, Math.Round(value * multiplier, 0, MidpointRounding.AwayFromZero));

    private static short ScaleDuration(short value, decimal multiplier)
        => (short)Math.Clamp(
            Math.Round(value * multiplier, 0, MidpointRounding.AwayFromZero),
            1,
            short.MaxValue);

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

    private static async Task SeedTiersAndBenefitsAsync(WashingCarDbContext db)
    {
        var now = DateTime.UtcNow;

        // 1. Tạo 4 hạng mặc định nếu chưa có
        if (!await db.Tiers.AnyAsync())
        {
            var defaultTiers = new[]
            {
                new Tier { TierId = Guid.NewGuid(), TierName = "Bronze", MinPoints = 0, EarnRate = 1.0m, Benefits = "Tích điểm tiêu chuẩn, đặt lịch trước tối đa 3 ngày.", IsActive = true, CreatedAtUtc = now },
                new Tier { TierId = Guid.NewGuid(), TierName = "Silver", MinPoints = 1000, EarnRate = 1.1m, Benefits = "Giảm giá 5% tổng hóa đơn, đặt lịch trước 7 ngày, tích lũy điểm thưởng +10%, quà tặng khăn lau cao cấp.", IsActive = true, CreatedAtUtc = now },
                new Tier { TierId = Guid.NewGuid(), TierName = "Gold", MinPoints = 2500, EarnRate = 1.25m, Benefits = "Giảm giá 10% tổng hóa đơn, đặt lịch trước 14 ngày, tích điểm thưởng +20%, miễn phí khử mùi Nano, ưu tiên khoang VIP.", IsActive = true, CreatedAtUtc = now },
                new Tier { TierId = Guid.NewGuid(), TierName = "Diamond", MinPoints = 5000, EarnRate = 1.5m, Benefits = "Giảm giá 15% tổng hóa đơn, đặt lịch trước 30 ngày, tích điểm thưởng +30%, miễn phí tẩy ố kính & dưỡng lốp, chăm sóc chuyên biệt VIP.", IsActive = true, CreatedAtUtc = now },
            };
            await db.Tiers.AddRangeAsync(defaultTiers);
            await db.SaveChangesAsync();
        }

        // 2. Nạp quyền lợi (Tier Benefits) và cập nhật mốc điểm chuẩn
        var tiers = await db.Tiers.AsNoTracking().ToListAsync();
        foreach (var tier in tiers)
        {
            var name = tier.TierName.ToLower();

            // 🥉 1. HẠNG ĐỒNG (Bronze)
            if (name.Contains("bronze") || name.Contains("đồng") || name.Contains("dong") || name.Contains("member"))
            {
                await db.Database.ExecuteSqlRawAsync("UPDATE [Tier] SET [MinPoints] = 0, [Benefits] = {0} WHERE [TierId] = {1}", "Tích điểm tiêu chuẩn, đặt lịch trước tối đa 3 ngày.", tier.TierId);
                await UpsertBenefitSqlAsync(db, tier.TierId, 2, "3", "Đặt lịch trước tối đa 3 ngày");
            }
            // 🥈 2. HẠNG BẠC (Silver)
            else if (name.Contains("silver") || name.Contains("bạc") || name.Contains("bac"))
            {
                await db.Database.ExecuteSqlRawAsync("UPDATE [Tier] SET [MinPoints] = 1000, [Benefits] = {0} WHERE [TierId] = {1}", "Giảm giá 5% tổng hóa đơn, đặt lịch trước 7 ngày, tích lũy điểm thưởng +10%, quà tặng khăn lau cao cấp.", tier.TierId);
                await UpsertBenefitSqlAsync(db, tier.TierId, 1, "5", "Giảm giá 5% trực tiếp trên hóa đơn đặt lịch");
                await UpsertBenefitSqlAsync(db, tier.TierId, 2, "7", "Đặt lịch trước tối đa 7 ngày");
                await UpsertBenefitSqlAsync(db, tier.TierId, 3, "Tặng 01 khăn lau xe chuyên dụng Microfiber", "Quà tặng tri ân thành viên Bạc");
                await UpsertBenefitSqlAsync(db, tier.TierId, 5, "10", "Tích lũy thêm 10% điểm thưởng mỗi lần rửa xe");
            }
            // 🥇 3. HẠNG VÀNG (Gold)
            else if (name.Contains("gold") || name.Contains("vàng") || name.Contains("vang"))
            {
                await db.Database.ExecuteSqlRawAsync("UPDATE [Tier] SET [MinPoints] = 2500, [Benefits] = {0} WHERE [TierId] = {1}", "Giảm giá 10% tổng hóa đơn, đặt lịch trước 14 ngày, tích điểm thưởng +20%, miễn phí khử mùi Nano, ưu tiên khoang VIP.", tier.TierId);
                await UpsertBenefitSqlAsync(db, tier.TierId, 1, "10", "Giảm giá 10% trực tiếp trên mọi dịch vụ");
                await UpsertBenefitSqlAsync(db, tier.TierId, 2, "14", "Đặt lịch trước tối đa 14 ngày");
                await UpsertBenefitSqlAsync(db, tier.TierId, 3, "Miễn phí 01 lần Xịt sương Nano khử khuẩn khoang lái", "Tặng dịch vụ xịt khử mùi Nano");
                await UpsertBenefitSqlAsync(db, tier.TierId, 4, "Ưu tiên điều phối khoang rửa VIP và tiếp nhận nhanh", "Quyền ưu tiên khoang VIP");
                await UpsertBenefitSqlAsync(db, tier.TierId, 5, "20", "Tích lũy thêm 20% điểm thưởng");
            }
            // 💎 4. HẠNG KIM CƯƠNG (Diamond / Platinum)
            else if (name.Contains("diamond") || name.Contains("kim") || name.Contains("platinum"))
            {
                await db.Database.ExecuteSqlRawAsync("UPDATE [Tier] SET [MinPoints] = 5000, [Benefits] = {0} WHERE [TierId] = {1}", "Giảm giá 15% tổng hóa đơn, đặt lịch trước 30 ngày, tích điểm thưởng +30%, miễn phí tẩy ố kính & dưỡng lốp, chăm sóc chuyên biệt VIP.", tier.TierId);
                await UpsertBenefitSqlAsync(db, tier.TierId, 1, "15", "Giảm giá 15% trực tiếp trên toàn bộ hóa đơn");
                await UpsertBenefitSqlAsync(db, tier.TierId, 2, "30", "Đặt lịch trước không giới hạn (tối đa 30 ngày)");
                await UpsertBenefitSqlAsync(db, tier.TierId, 3, "Miễn phí Tẩy ố kính lái & Phủ dưỡng bóng lốp cao cấp", "Dịch vụ chăm sóc chuyên sâu miễn phí");
                await UpsertBenefitSqlAsync(db, tier.TierId, 4, "Hỗ trợ Hotline riêng 24/7 và Ưu tiên khoang rửa cao cấp nhất", "Dịch vụ khách hàng thượng hạng");
                await UpsertBenefitSqlAsync(db, tier.TierId, 5, "30", "Tích lũy thêm 30% điểm thưởng");
            }
        }
    }

    private static async Task UpsertBenefitSqlAsync(WashingCarDbContext db, Guid tierId, byte benefitType, string benefitValue, string description)
    {
        await db.Database.ExecuteSqlRawAsync("""
            IF EXISTS (SELECT 1 FROM [TierBenefit] WHERE [TierId] = {0} AND [BenefitType] = {1})
            BEGIN
                UPDATE [TierBenefit]
                SET [BenefitValue] = {2},
                    [Description] = {3},
                    [IsActive] = 1
                WHERE [TierId] = {0} AND [BenefitType] = {1};
            END
            ELSE
            BEGIN
                INSERT INTO [TierBenefit] ([TierBenefitId], [TierId], [BenefitType], [BenefitValue], [Description], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), {0}, {1}, {2}, {3}, 1, SYSUTCDATETIME());
            END
            """, tierId, benefitType, benefitValue, description);
    }
}
