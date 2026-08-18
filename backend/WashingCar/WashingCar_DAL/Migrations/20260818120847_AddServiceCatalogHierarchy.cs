using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceCatalogHierarchy : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ParentServiceCatalogItemId",
                table: "ServiceCatalogItem",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "SelectionMode",
                table: "ServiceCatalogItem",
                type: "tinyint",
                nullable: true);

            migrationBuilder.AddColumn<byte>(
                name: "ServiceNodeType",
                table: "ServiceCatalogItem",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)2);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceCatalogItem_ParentServiceCatalogItemId",
                table: "ServiceCatalogItem",
                column: "ParentServiceCatalogItemId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceCatalogItem_GroupBillingFields",
                table: "ServiceCatalogItem",
                sql: "([ServiceNodeType] = 1 AND [BasePrice] = 0 AND [DurationMinutes] = 0) OR [ServiceNodeType] = 2");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceCatalogItem_GroupSelectionMode",
                table: "ServiceCatalogItem",
                sql: "([ServiceNodeType] = 1 AND [SelectionMode] = 1) OR ([ServiceNodeType] = 2 AND [SelectionMode] IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "CK_ServiceCatalogItem_ServiceNodeType",
                table: "ServiceCatalogItem",
                sql: "[ServiceNodeType] IN (1, 2)");

            migrationBuilder.AddForeignKey(
                name: "FK_ServiceCatalogItem_Parent",
                table: "ServiceCatalogItem",
                column: "ParentServiceCatalogItemId",
                principalTable: "ServiceCatalogItem",
                principalColumn: "ServiceCatalogItemId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ServiceCatalogItem_Parent",
                table: "ServiceCatalogItem");

            migrationBuilder.DropIndex(
                name: "IX_ServiceCatalogItem_ParentServiceCatalogItemId",
                table: "ServiceCatalogItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceCatalogItem_GroupBillingFields",
                table: "ServiceCatalogItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceCatalogItem_GroupSelectionMode",
                table: "ServiceCatalogItem");

            migrationBuilder.DropCheckConstraint(
                name: "CK_ServiceCatalogItem_ServiceNodeType",
                table: "ServiceCatalogItem");

            migrationBuilder.DropColumn(
                name: "ParentServiceCatalogItemId",
                table: "ServiceCatalogItem");

            migrationBuilder.DropColumn(
                name: "SelectionMode",
                table: "ServiceCatalogItem");

            migrationBuilder.DropColumn(
                name: "ServiceNodeType",
                table: "ServiceCatalogItem");
        }
    }
}
