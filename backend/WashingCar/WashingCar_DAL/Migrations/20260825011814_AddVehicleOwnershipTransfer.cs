using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleOwnershipTransfer : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VehicleTransferRequest",
                columns: table => new
                {
                    VehicleTransferRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ToUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Status = table.Column<byte>(type: "tinyint", nullable: false, defaultValue: (byte)1),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())"),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleTransferRequest", x => x.VehicleTransferRequestId);
                    table.CheckConstraint("CK_VehicleTransferRequest_DifferentUsers", "[FromUserId] <> [ToUserId]");
                    table.CheckConstraint("CK_VehicleTransferRequest_Status", "[Status] IN (1, 2, 3, 4)");
                    table.ForeignKey(
                        name: "FK_VehicleTransferRequest_FromUser",
                        column: x => x.FromUserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VehicleTransferRequest_ReviewedBy",
                        column: x => x.ReviewedByUserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VehicleTransferRequest_ToUser",
                        column: x => x.ToUserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VehicleTransferRequest_Vehicle",
                        column: x => x.VehicleId,
                        principalTable: "Vehicle",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VehicleOwnershipHistory",
                columns: table => new
                {
                    VehicleOwnershipHistoryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    VehicleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OwnedFromUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false),
                    OwnedToUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: true),
                    VehicleTransferRequestId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RecordedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleOwnershipHistory", x => x.VehicleOwnershipHistoryId);
                    table.CheckConstraint("CK_VehicleOwnershipHistory_ValidPeriod", "[OwnedToUtc] IS NULL OR [OwnedToUtc] >= [OwnedFromUtc]");
                    table.ForeignKey(
                        name: "FK_VehicleOwnershipHistory_RecordedBy",
                        column: x => x.RecordedByUserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VehicleOwnershipHistory_TransferRequest",
                        column: x => x.VehicleTransferRequestId,
                        principalTable: "VehicleTransferRequest",
                        principalColumn: "VehicleTransferRequestId",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_VehicleOwnershipHistory_User",
                        column: x => x.UserId,
                        principalTable: "User",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_VehicleOwnershipHistory_Vehicle",
                        column: x => x.VehicleId,
                        principalTable: "Vehicle",
                        principalColumn: "VehicleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleOwnershipHistory_RecordedByUserId",
                table: "VehicleOwnershipHistory",
                column: "RecordedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleOwnershipHistory_UserId",
                table: "VehicleOwnershipHistory",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleOwnershipHistory_VehicleId",
                table: "VehicleOwnershipHistory",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleOwnershipHistory_VehicleTransferRequestId",
                table: "VehicleOwnershipHistory",
                column: "VehicleTransferRequestId");

            migrationBuilder.CreateIndex(
                name: "UX_VehicleOwnershipHistory_Current",
                table: "VehicleOwnershipHistory",
                column: "VehicleId",
                unique: true,
                filter: "([OwnedToUtc] IS NULL)");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleTransferRequest_FromUserId",
                table: "VehicleTransferRequest",
                column: "FromUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleTransferRequest_ReviewedByUserId",
                table: "VehicleTransferRequest",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleTransferRequest_Status_CreatedAtUtc",
                table: "VehicleTransferRequest",
                columns: new[] { "Status", "CreatedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleTransferRequest_ToUserId",
                table: "VehicleTransferRequest",
                column: "ToUserId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleTransferRequest_VehicleId",
                table: "VehicleTransferRequest",
                column: "VehicleId");

            migrationBuilder.CreateIndex(
                name: "UX_VehicleTransferRequest_PendingVehicle",
                table: "VehicleTransferRequest",
                column: "VehicleId",
                unique: true,
                filter: "([Status]=(1))");
            migrationBuilder.Sql("""
                INSERT INTO dbo.VehicleOwnershipHistory
                    (VehicleId, UserId, OwnedFromUtc, CreatedAtUtc)
                SELECT
                    v.VehicleId,
                    v.UserId,
                    v.CreatedAtUtc,
                    SYSUTCDATETIME()
                FROM dbo.Vehicle AS v
                WHERE v.IsDeleted = 0
                  AND NOT EXISTS
                  (
                      SELECT 1
                      FROM dbo.VehicleOwnershipHistory AS h
                      WHERE h.VehicleId = v.VehicleId
                        AND h.OwnedToUtc IS NULL
                  );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VehicleOwnershipHistory");

            migrationBuilder.DropTable(
                name: "VehicleTransferRequest");
        }
    }
}
