using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchIdToVoucher : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Voucher') AND name = N'BranchId')
                ALTER TABLE [Voucher] ADD [BranchId] uniqueidentifier NULL;");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Voucher_BranchId' AND object_id = OBJECT_ID(N'Voucher'))
                EXEC(N'CREATE INDEX [IX_Voucher_BranchId] ON [Voucher] ([BranchId]) WHERE [BranchId] IS NOT NULL');");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Voucher_Branch')
                ALTER TABLE [Voucher] ADD CONSTRAINT [FK_Voucher_Branch] FOREIGN KEY ([BranchId]) REFERENCES [Branch] ([BranchId]);");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Voucher_Branch",
                table: "Voucher");

            migrationBuilder.DropIndex(
                name: "IX_Voucher_BranchId",
                table: "Voucher");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Voucher");
        }
    }
}
