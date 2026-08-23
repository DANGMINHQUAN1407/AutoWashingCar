using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueUserVoucherPerUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // GET /my-vouchers used to be able to claim the same system voucher
            // twice under concurrent requests. Keep the oldest/latest usable row
            // and remove duplicate rows that are not referenced by a booking.
            migrationBuilder.Sql("""
                ;WITH RankedUserVouchers AS
                (
                    SELECT
                        uv.UserVoucherId,
                        ROW_NUMBER() OVER
                        (
                            PARTITION BY uv.UserId, uv.VoucherId
                            ORDER BY
                                CASE WHEN EXISTS
                                (
                                    SELECT 1
                                    FROM Booking b
                                    WHERE b.UserVoucherId = uv.UserVoucherId
                                ) THEN 0 ELSE 1 END,
                                uv.RedeemedAtUtc DESC,
                                uv.UserVoucherId
                        ) AS RowNumber
                    FROM UserVoucher uv
                )
                DELETE uv
                FROM UserVoucher uv
                INNER JOIN RankedUserVouchers ranked
                    ON ranked.UserVoucherId = uv.UserVoucherId
                WHERE ranked.RowNumber > 1
                  AND NOT EXISTS
                  (
                      SELECT 1
                      FROM Booking b
                      WHERE b.UserVoucherId = uv.UserVoucherId
                  );
                """);

            migrationBuilder.CreateIndex(
                name: "UQ_UserVoucher_User_Voucher",
                table: "UserVoucher",
                columns: new[] { "UserId", "VoucherId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UQ_UserVoucher_User_Voucher",
                table: "UserVoucher");
        }
    }
}
