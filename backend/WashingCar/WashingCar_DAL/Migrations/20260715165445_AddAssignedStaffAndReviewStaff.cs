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
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = N'StaffId' AND object_id = OBJECT_ID(N'[Review]'))
                BEGIN
                    ALTER TABLE [Review] ADD [StaffId] uniqueidentifier NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = N'AssignedAtUtc' AND object_id = OBJECT_ID(N'[Booking]'))
                BEGIN
                    ALTER TABLE [Booking] ADD [AssignedAtUtc] datetime2(3) NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE name = N'AssignedStaffId' AND object_id = OBJECT_ID(N'[Booking]'))
                BEGIN
                    ALTER TABLE [Booking] ADD [AssignedStaffId] uniqueidentifier NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Review_StaffId' AND object_id = OBJECT_ID(N'[Review]'))
                BEGIN
                    CREATE INDEX [IX_Review_StaffId] ON [Review] ([StaffId]) WHERE [StaffId] IS NOT NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_Booking_AssignedStaffId' AND object_id = OBJECT_ID(N'[Booking]'))
                BEGIN
                    CREATE INDEX [IX_Booking_AssignedStaffId] ON [Booking] ([AssignedStaffId]) WHERE [AssignedStaffId] IS NOT NULL;
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_Booking_AssignedStaff' AND parent_object_id = OBJECT_ID(N'[Booking]'))
                BEGIN
                    ALTER TABLE [Booking] ADD CONSTRAINT [FK_Booking_AssignedStaff]
                    FOREIGN KEY ([AssignedStaffId]) REFERENCES [User] ([UserId]);
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = N'FK_Review_Staff' AND parent_object_id = OBJECT_ID(N'[Review]'))
                BEGIN
                    ALTER TABLE [Review] ADD CONSTRAINT [FK_Review_Staff]
                    FOREIGN KEY ([StaffId]) REFERENCES [User] ([UserId]);
                END
            ");
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
