using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleCatalogTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "BodyStyleCatalogId",
                table: "Vehicle",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "EngineCatalogId",
                table: "Vehicle",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "VehicleBodyStyleCatalog",
                columns: table => new
                {
                    VehicleBodyStyleCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    LegacyEnumValue = table.Column<byte>(type: "tinyint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleBodyStyleCatalog", x => x.VehicleBodyStyleCatalogId);
                });

            migrationBuilder.CreateTable(
                name: "VehicleEngineCatalog",
                columns: table => new
                {
                    VehicleEngineCatalogId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    Code = table.Column<string>(type: "varchar(50)", unicode: false, maxLength: 50, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    LegacyEnumValue = table.Column<byte>(type: "tinyint", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleEngineCatalog", x => x.VehicleEngineCatalogId);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Vehicle_BodyStyleCatalogId",
                table: "Vehicle",
                column: "BodyStyleCatalogId");

            migrationBuilder.CreateIndex(
                name: "IX_Vehicle_EngineCatalogId",
                table: "Vehicle",
                column: "EngineCatalogId");

            migrationBuilder.CreateIndex(
                name: "UQ_VehicleBodyStyleCatalog_Code",
                table: "VehicleBodyStyleCatalog",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UQ_VehicleEngineCatalog_Code",
                table: "VehicleEngineCatalog",
                column: "Code",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicle_BodyStyleCatalog",
                table: "Vehicle",
                column: "BodyStyleCatalogId",
                principalTable: "VehicleBodyStyleCatalog",
                principalColumn: "VehicleBodyStyleCatalogId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Vehicle_EngineCatalog",
                table: "Vehicle",
                column: "EngineCatalogId",
                principalTable: "VehicleEngineCatalog",
                principalColumn: "VehicleEngineCatalogId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Vehicle_BodyStyleCatalog",
                table: "Vehicle");

            migrationBuilder.DropForeignKey(
                name: "FK_Vehicle_EngineCatalog",
                table: "Vehicle");

            migrationBuilder.DropTable(
                name: "VehicleBodyStyleCatalog");

            migrationBuilder.DropTable(
                name: "VehicleEngineCatalog");

            migrationBuilder.DropIndex(
                name: "IX_Vehicle_BodyStyleCatalogId",
                table: "Vehicle");

            migrationBuilder.DropIndex(
                name: "IX_Vehicle_EngineCatalogId",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "BodyStyleCatalogId",
                table: "Vehicle");

            migrationBuilder.DropColumn(
                name: "EngineCatalogId",
                table: "Vehicle");
        }
    }
}
