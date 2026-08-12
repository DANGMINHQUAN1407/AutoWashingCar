using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddDiscountTypeToVoucher3 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte>(
                name: "DiscountType",
                table: "Voucher",
                type: "tinyint",
                nullable: false,
                defaultValue: (byte)0);

            migrationBuilder.Sql(@"
                -- Drop the old constraint
                ALTER TABLE Voucher DROP CONSTRAINT CK_Voucher_TypeValue;

                -- Map DiscountType from old VoucherType (1 = Percentage, 2 = FixedAmount)
                UPDATE Voucher SET DiscountType = VoucherType;

                -- Assign new VoucherType
                -- 3 = Tier (if exists in TierVoucher)
                -- 2 = Branch (if BranchId is not null)
                -- 1 = System (if BranchId is null)
                UPDATE Voucher SET VoucherType = 3 WHERE VoucherId IN (SELECT VoucherId FROM TierVoucher);
                UPDATE Voucher SET VoucherType = 2 WHERE BranchId IS NOT NULL AND VoucherType != 3;
                UPDATE Voucher SET VoucherType = 1 WHERE BranchId IS NULL AND VoucherType != 3;
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE Voucher SET VoucherType = DiscountType;");

            migrationBuilder.DropColumn(
                name: "DiscountType",
                table: "Voucher");
        }
    }
}
