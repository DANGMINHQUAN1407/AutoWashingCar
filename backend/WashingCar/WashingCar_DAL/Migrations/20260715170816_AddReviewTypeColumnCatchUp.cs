using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    /// <remarks>
    /// Bù đắp drift từ tính năng RatingFeedback (đã merge trước đó): entity Review.ReviewType
    /// và cấu hình UQ_Review_Booking_Type/CK_Review_Type đã có sẵn trong code (Review.cs,
    /// WashingCarDbContext.cs, database/WashingCar.sql) nhưng chưa từng có migration tương ứng,
    /// nên EF không tự sinh được diff cho phần này (model snapshot coi như đã "đồng bộ").
    /// Migration này viết tay để đưa DB thật bắt kịp đúng model đang có.
    /// </remarks>
    public partial class AddReviewTypeColumnCatchUp : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE Name = N'ReviewType' AND Object_ID = Object_ID(N'Review'))
                BEGIN
                    ALTER TABLE [Review] ADD [ReviewType] int NOT NULL DEFAULT 1;
                END
            ");

            // UQ_Review_Booking là UNIQUE CONSTRAINT (không phải index thường) nên phải DROP CONSTRAINT,
            // không dùng DROP INDEX (SQL Server chặn: "not allowed... used for UNIQUE KEY constraint enforcement").
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM sys.key_constraints WHERE name = 'UQ_Review_Booking' AND type = 'UQ')
                BEGIN
                    ALTER TABLE [Review] DROP CONSTRAINT [UQ_Review_Booking];
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'UQ_Review_Booking_Type' AND object_id = OBJECT_ID('Review'))
                BEGIN
                    CREATE UNIQUE INDEX [UQ_Review_Booking_Type] ON [Review] ([BookingId], [ReviewType]);
                END
            ");

            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sys.check_constraints WHERE name = 'CK_Review_Type' AND parent_object_id = OBJECT_ID('Review'))
                BEGIN
                    ALTER TABLE [Review] ADD CONSTRAINT CK_Review_Type CHECK (ReviewType IN (1, 2));
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE [Review] DROP CONSTRAINT CK_Review_Type;");

            migrationBuilder.DropIndex(
                name: "UQ_Review_Booking_Type",
                table: "Review");

            migrationBuilder.Sql("ALTER TABLE [Review] ADD CONSTRAINT [UQ_Review_Booking] UNIQUE ([BookingId]);");

            migrationBuilder.DropColumn(
                name: "ReviewType",
                table: "Review");
        }
    }
}
