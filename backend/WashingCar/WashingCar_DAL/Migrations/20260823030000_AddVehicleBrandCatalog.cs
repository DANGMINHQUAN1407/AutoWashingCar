using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    public partial class AddVehicleBrandCatalog : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VehicleBrandCatalog",
                columns: table => new
                {
                    VehicleBrandCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    IsLuxury = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleBrandCatalog", x => x.VehicleBrandCatalogId);
                });

            migrationBuilder.AddColumn<Guid>(
                name: "BrandCatalogId",
                table: "Vehicle",
                type: "uniqueidentifier",
                nullable: true);

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
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicle_BrandCatalog",
                table: "Vehicle");

            migrationBuilder.DropIndex(
                name: "IX_Vehicle_BrandCatalogId",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "BrandCatalogId",
                table: "Vehicle");

            migrationBuilder.DropTable(
                name: "VehicleBrandCatalog");
        }
    }
}
