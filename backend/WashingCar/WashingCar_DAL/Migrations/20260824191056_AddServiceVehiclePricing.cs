using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceVehiclePricing : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {

            migrationBuilder.DropIndex(
                name: "UQ_UserVoucher_User_Voucher",
                table: "UserVoucher");

            migrationBuilder.DropIndex(
                name: "UX_Payment_Booking_Pending",
                table: "Payment");

            migrationBuilder.CreateTable(
                name: "ServiceVehiclePricing",
                columns: table => new
                {
                    ServiceVehiclePricingId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    ServiceCatalogItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VehicleType = table.Column<byte>(type: "tinyint", nullable: false),
                    EngineCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    DurationMinutes = table.Column<short>(type: "smallint", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceVehiclePricing", x => x.ServiceVehiclePricingId);
                    table.CheckConstraint("CK_ServiceVehiclePricing_DurationMinutes", "[DurationMinutes] > 0");
                    table.CheckConstraint("CK_ServiceVehiclePricing_UnitPrice", "[UnitPrice] > 0");
                    table.CheckConstraint("CK_ServiceVehiclePricing_VehicleType", "[VehicleType] IN (1, 2, 3)");
                    table.ForeignKey(
                        name: "FK_ServiceVehiclePricing_EngineCatalog",
                        column: x => x.EngineCatalogId,
                        principalTable: "VehicleEngineCatalog",
                        principalColumn: "VehicleEngineCatalogId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ServiceVehiclePricing_Service",
                        column: x => x.ServiceCatalogItemId,
                        principalTable: "ServiceCatalogItem",
                        principalColumn: "ServiceCatalogItemId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceVehiclePricing_EngineCatalogId",
                table: "ServiceVehiclePricing",
                column: "EngineCatalogId");

            migrationBuilder.CreateIndex(
                name: "UX_ServiceVehiclePricing_DefaultScope",
                table: "ServiceVehiclePricing",
                columns: new[] { "ServiceCatalogItemId", "VehicleType" },
                unique: true,
                filter: "[EngineCatalogId] IS NULL");

            migrationBuilder.CreateIndex(
                name: "UX_ServiceVehiclePricing_ExactScope",
                table: "ServiceVehiclePricing",
                columns: new[] { "ServiceCatalogItemId", "VehicleType", "EngineCatalogId" },
                unique: true,
                filter: "[EngineCatalogId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServiceVehiclePricing");

            migrationBuilder.CreateIndex(
                name: "UQ_VehicleBrandCatalog_Name",
                table: "VehicleBrandCatalog",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_UserVoucher_User_Voucher",
                table: "UserVoucher",
                columns: new[] { "UserId", "VoucherId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Payment_Booking_Pending",
                table: "Payment",
                column: "BookingId",
                unique: true,
                filter: "([PaymentStatus]=(1))");
        }
    }
}
