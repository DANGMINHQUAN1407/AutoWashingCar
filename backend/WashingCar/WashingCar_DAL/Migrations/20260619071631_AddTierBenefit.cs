using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddTierBenefit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TierBenefit",
                columns: table => new
                {
                    TierBenefitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false, defaultValueSql: "(newsequentialid())"),
                    TierId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BenefitType = table.Column<byte>(type: "tinyint", nullable: false),
                    BenefitValue = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2(3)", precision: 3, nullable: false, defaultValueSql: "(sysutcdatetime())")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TierBenefit", x => x.TierBenefitId);
                    table.ForeignKey(
                        name: "FK_TierBenefit_Tier",
                        column: x => x.TierId,
                        principalTable: "Tier",
                        principalColumn: "TierId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "UQ_TierBenefit_Tier_Type",
                table: "TierBenefit",
                columns: new[] { "TierId", "BenefitType" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TierBenefit");
        }
    }
}
