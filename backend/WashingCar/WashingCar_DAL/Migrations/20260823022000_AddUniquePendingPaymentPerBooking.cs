using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using WashingCar_DAL.Data;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    [DbContext(typeof(WashingCarDbContext))]
    [Migration("20260823022000_AddUniquePendingPaymentPerBooking")]
    public partial class AddUniquePendingPaymentPerBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Preserve payment history but cancel older duplicate pending attempts
            // before adding the one-pending-payment-per-booking invariant.
            migrationBuilder.Sql("""
                ;WITH RankedPendingPayments AS
                (
                    SELECT
                        p.PaymentId,
                        ROW_NUMBER() OVER
                        (
                            PARTITION BY p.BookingId
                            ORDER BY p.CreatedAtUtc DESC, p.PaymentId DESC
                        ) AS RowNumber
                    FROM Payment p
                    WHERE p.PaymentStatus = 1
                )
                UPDATE p
                SET PaymentStatus = 4
                FROM Payment p
                INNER JOIN RankedPendingPayments ranked
                    ON ranked.PaymentId = p.PaymentId
                WHERE ranked.RowNumber > 1;
                """);

            migrationBuilder.CreateIndex(
                name: "UX_Payment_Booking_Pending",
                table: "Payment",
                column: "BookingId",
                unique: true,
                filter: "([PaymentStatus]=(1))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UX_Payment_Booking_Pending",
                table: "Payment");
        }
    }
}
