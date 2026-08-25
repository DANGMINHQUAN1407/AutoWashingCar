using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddLoyaltyLedgerBookingIdempotency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "UQ_LLE_Booking_EntryType",
                table: "LoyaltyLedgerEntry",
                columns: new[] { "BookingId", "EntryType" },
                unique: true,
                filter: "([BookingId] IS NOT NULL AND [EntryType] IN (1, 2, 3))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "UQ_LLE_Booking_EntryType",
                table: "LoyaltyLedgerEntry");
        }
    }
}
