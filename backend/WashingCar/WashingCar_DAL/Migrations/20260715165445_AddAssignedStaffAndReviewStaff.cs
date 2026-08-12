using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignedStaffAndReviewStaff : Migration
    {
        /// <inheritdoc />
        // Lưu ý: bản diff gốc do `dotnet ef migrations add` sinh ra còn kèm theo phần
        // ReviewType/UQ_Review_Booking_Type — đó là drift CŨ, không liên quan, đã tồn tại
        // sẵn trong code (Review.cs/WashingCarDbContext.cs) và trong database/WashingCar.sql
        // từ trước (tính năng RatingFeedback) nhưng chưa từng có migration tương ứng.
        // Cột/index đó đã tồn tại thật trên DB (vì DB được tạo từ WashingCar.sql), nên đã
        // lược bỏ khỏi migration này để tránh lỗi "column/index already exists" khi
        // chạy `dotnet ef database update` trên DB đã có sẵn. Chỉ giữ lại phần AssignedStaffId/StaffId.
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "StaffId",
                table: "Review",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "AssignedAtUtc",
                table: "Booking",
                type: "datetime2(3)",
                precision: 3,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "AssignedStaffId",
                table: "Booking",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Review_StaffId",
                table: "Review",
                column: "StaffId",
                filter: "([StaffId] IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_Booking_AssignedStaffId",
                table: "Booking",
                column: "AssignedStaffId",
                filter: "([AssignedStaffId] IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_Booking_AssignedStaff",
                table: "Booking",
                column: "AssignedStaffId",
                principalTable: "User",
                principalColumn: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Review_Staff",
                table: "Review",
                column: "StaffId",
                principalTable: "User",
                principalColumn: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Booking_AssignedStaff",
                table: "Booking");

            migrationBuilder.DropForeignKey(
                name: "FK_Review_Staff",
                table: "Review");

            migrationBuilder.DropIndex(
                name: "IX_Review_StaffId",
                table: "Review");

            migrationBuilder.DropIndex(
                name: "IX_Booking_AssignedStaffId",
                table: "Booking");

            migrationBuilder.DropColumn(
                name: "StaffId",
                table: "Review");

            migrationBuilder.DropColumn(
                name: "AssignedAtUtc",
                table: "Booking");

            migrationBuilder.DropColumn(
                name: "AssignedStaffId",
                table: "Booking");
        }
    }
}
