using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddServicePackageType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "ServicePackageType",
                table: "ServiceCatalogItem",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)1);

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceCatalogItem_ServicePackageType",
                table: "ServiceCatalogItem",
                sql: "[ServicePackageType] IN (1, 2, 3)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceCatalogItem_ServicePackageType",
                table: "ServiceCatalogItem");

            migrationBuilder.DropColumn(
                name: "ServicePackageType",
                table: "ServiceCatalogItem");
        }
    }
}
