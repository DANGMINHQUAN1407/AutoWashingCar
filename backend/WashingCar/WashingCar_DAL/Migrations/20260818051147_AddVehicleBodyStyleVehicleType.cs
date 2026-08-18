using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleBodyStyleVehicleType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "VehicleType",
                table: "VehicleBodyStyleCatalog",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)2);

            migrationBuilder.CreateIndex(
                name: "IX_VehicleBodyStyleCatalog_VehicleType",
                table: "VehicleBodyStyleCatalog",
                column: "VehicleType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_VehicleBodyStyleCatalog_VehicleType",
                table: "VehicleBodyStyleCatalog");

            migrationBuilder.DropColumn(
                name: "VehicleType",
                table: "VehicleBodyStyleCatalog");
        }
    }
}
