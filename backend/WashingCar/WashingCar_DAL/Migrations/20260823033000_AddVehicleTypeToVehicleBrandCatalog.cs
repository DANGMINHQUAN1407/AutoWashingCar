using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    public partial class AddVehicleTypeToVehicleBrandCatalog : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UQ_VehicleBrandCatalog_Name",
                table: "VehicleBrandCatalog");

            migrationBuilder.AddColumn<byte>(
                name: "VehicleType",
                table: "VehicleBrandCatalog",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)2);

            migrationBuilder.AddColumn<bool>(
                name: "IsLuxury",
                table: "VehicleBrandCatalog",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleBrandCatalog_VehicleType",
                table: "VehicleBrandCatalog",
                column: "VehicleType");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VehicleBrandCatalog_VehicleType",
                table: "VehicleBrandCatalog");

            migrationBuilder.DropColumn(
                name: "VehicleType",
                table: "VehicleBrandCatalog");

            migrationBuilder.DropColumn(
                name: "IsLuxury",
                table: "VehicleBrandCatalog");

            migrationBuilder.CreateIndex(
                name: "UQ_VehicleBrandCatalog_Name",
                table: "VehicleBrandCatalog",
                column: "Name",
                unique: true);
        }
    }
}
