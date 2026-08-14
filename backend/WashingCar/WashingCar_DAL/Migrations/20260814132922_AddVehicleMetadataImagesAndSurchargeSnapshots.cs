using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleMetadataImagesAndSurchargeSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "BodyStyle",
                table: "Vehicle",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "EngineType",
                table: "Vehicle",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ManufactureYear",
                table: "Vehicle",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Model",
                table: "Vehicle",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "VehicleConditionAtBooking",
                table: "Booking",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)2);

            migrationBuilder.AddColumn<decimal>(
                name: "VehicleSurchargeAmount",
                table: "Booking",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "VehicleSurchargeRate",
                table: "Booking",
                type: "decimal(9,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "VehicleImage",
                columns: table => new
                {
                    VehicleImageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ImageUrl = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    UploadedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleImage", x => x.VehicleImageId);
                    table.ForeignKey(
                        name: "FK_VehicleImage_Vehicle",
                        column: x => x.VehicleId,
                        principalTable: "Vehicle",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleImage_VehicleId",
                table: "VehicleImage",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "UX_VehicleImage_Primary",
                table: "VehicleImage",
                column: "VehicleId",
                unique: true,
                filter: "([IsPrimary]=(1))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VehicleImage");

            migrationBuilder.DropColumn(
                name: "BodyStyle",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "EngineType",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "ManufactureYear",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "Model",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "VehicleConditionAtBooking",
                table: "Booking");

            migrationBuilder.DropColumn(
                name: "VehicleSurchargeAmount",
                table: "Booking");

            migrationBuilder.DropColumn(
                name: "VehicleSurchargeRate",
                table: "Booking");
        }
    }
}
