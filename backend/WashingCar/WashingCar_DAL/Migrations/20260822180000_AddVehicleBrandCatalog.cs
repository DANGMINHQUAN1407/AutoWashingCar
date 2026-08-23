using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using WashingCar_DAL.Data;

#nullable disable

namespace WashingCar_DAL.Migrations;

[DbContext(typeof(WashingCarDbContext))]
[Migration("20260822180000_AddVehicleBrandCatalog")]
public partial class AddVehicleBrandCatalog : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<Guid>(
            name: "BrandCatalogId",
            table: "Vehicle",
            type: "uniqueidentifier",
            nullable: true);

        migrationBuilder.CreateTable(
            name: "VehicleBrandCatalog",
            columns: table => new
            {
                VehicleBrandCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_VehicleBrandCatalog", x => x.VehicleBrandCatalogId);
            });

        migrationBuilder.CreateIndex(
            name: "IX_Vehicle_BrandCatalogId",
            table: "Vehicle",
            column: "BrandCatalogId");

        migrationBuilder.CreateIndex(
            name: "UQ_VehicleBrandCatalog_Code",
            table: "VehicleBrandCatalog",
            column: "Code",
            unique: true);

        migrationBuilder.CreateIndex(
            name: "UQ_VehicleBrandCatalog_Name",
            table: "VehicleBrandCatalog",
            column: "Name",
            unique: true);

        migrationBuilder.AddForeignKey(
            name: "FK_Vehicle_BrandCatalog",
            table: "Vehicle",
            column: "BrandCatalogId",
            principalTable: "VehicleBrandCatalog",
            principalColumn: "VehicleBrandCatalogId",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.Sql("""
            DECLARE @now DATETIME2(3) = SYSUTCDATETIME();

            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'HONDA')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'HONDA', 'Honda', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'YAMAHA')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'YAMAHA', 'Yamaha', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'TOYOTA')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'TOYOTA', 'Toyota', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'FORD')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'FORD', 'Ford', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'THACO')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'THACO', 'THACO', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'VINFAST')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'VINFAST', 'VinFast', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'SUZUKI')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'SUZUKI', 'Suzuki', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'MAZDA')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'MAZDA', 'Mazda', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'HYUNDAI')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'HYUNDAI', 'Hyundai', 1, @now);
            IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBrandCatalog] WHERE [Code] = 'KIA')
                INSERT INTO [dbo].[VehicleBrandCatalog] ([VehicleBrandCatalogId], [Code], [Name], [IsActive], [CreatedAtUtc])
                VALUES (NEWID(), 'KIA', 'Kia', 1, @now);

            UPDATE v
            SET v.[BrandCatalogId] = b.[VehicleBrandCatalogId]
            FROM [dbo].[Vehicle] v
            INNER JOIN [dbo].[VehicleBrandCatalog] b
                ON UPPER(LTRIM(RTRIM(v.[Brand]))) IN (UPPER(b.[Code]), UPPER(b.[Name]))
            WHERE v.[BrandCatalogId] IS NULL
              AND NULLIF(LTRIM(RTRIM(v.[Brand])), '') IS NOT NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_Vehicle_BrandCatalog",
            table: "Vehicle");

        migrationBuilder.DropTable(
            name: "VehicleBrandCatalog");

        migrationBuilder.DropIndex(
            name: "IX_Vehicle_BrandCatalogId",
            table: "Vehicle");

        migrationBuilder.DropColumn(
            name: "BrandCatalogId",
            table: "Vehicle");
    }
}
