using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WashingCar_DAL.Migrations
{
    /// <inheritdoc />
    public partial class AddBranchManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_SlotInventory_DateTime' AND object_id = OBJECT_ID('SlotInventory'))
                DROP INDEX [UQ_SlotInventory_DateTime] ON [SlotInventory]
            IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'UQ_SlotInventory_DateTime' AND parent_object_id = OBJECT_ID('SlotInventory'))
                ALTER TABLE [SlotInventory] DROP CONSTRAINT [UQ_SlotInventory_DateTime]");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'User') AND name = N'BranchId')
                ALTER TABLE [User] ADD [BranchId] uniqueidentifier NULL;");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'SlotInventory') AND name = N'BranchId')
                ALTER TABLE [SlotInventory] ADD [BranchId] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'Booking') AND name = N'BranchId')
                ALTER TABLE [Booking] ADD [BranchId] uniqueidentifier NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'Branch')
            BEGIN
                CREATE TABLE [Branch] (
                    [BranchId] uniqueidentifier NOT NULL DEFAULT (newsequentialid()),
                    [BranchCode] varchar(20) NOT NULL,
                    [Name] nvarchar(200) NOT NULL,
                    [Address] nvarchar(500) NOT NULL,
                    [City] nvarchar(100) NOT NULL,
                    [Phone] varchar(20) NOT NULL,
                    [Email] varchar(255) NULL,
                    [Latitude] decimal(9,6) NULL,
                    [Longitude] decimal(9,6) NULL,
                    [OpenTime] time NOT NULL,
                    [CloseTime] time NOT NULL,
                    [ManagerId] uniqueidentifier NULL,
                    [IsActive] bit NOT NULL DEFAULT 1,
                    [IsDeleted] bit NOT NULL,
                    [CreatedAtUtc] datetime2(3) NOT NULL DEFAULT (sysutcdatetime()),
                    [UpdatedAtUtc] datetime2(3) NULL,
                    CONSTRAINT [PK_Branch] PRIMARY KEY ([BranchId]),
                    CONSTRAINT [FK_Branch_Manager] FOREIGN KEY ([ManagerId]) REFERENCES [User] ([UserId]) ON DELETE SET NULL
                );
            END");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = N'BranchService')
            BEGIN
                CREATE TABLE [BranchService] (
                    [BranchId] uniqueidentifier NOT NULL,
                    [ServiceCatalogItemId] uniqueidentifier NOT NULL,
                    [IsActive] bit NOT NULL DEFAULT 1,
                    [AddedAtUtc] datetime2(3) NOT NULL DEFAULT (sysutcdatetime()),
                    CONSTRAINT [PK_BranchService] PRIMARY KEY ([BranchId], [ServiceCatalogItemId]),
                    CONSTRAINT [FK_BranchService_Branch] FOREIGN KEY ([BranchId]) REFERENCES [Branch] ([BranchId]) ON DELETE CASCADE,
                    CONSTRAINT [FK_BranchService_Service] FOREIGN KEY ([ServiceCatalogItemId]) REFERENCES [ServiceCatalogItem] ([ServiceCatalogItemId]) ON DELETE CASCADE
                );
            END");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_User_BranchId' AND object_id = OBJECT_ID(N'User'))
                EXEC(N'CREATE INDEX [IX_User_BranchId] ON [User] ([BranchId]) WHERE ([BranchId] IS NOT NULL)');");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_SlotInventory_BranchId' AND object_id = OBJECT_ID(N'SlotInventory'))
                CREATE INDEX [IX_SlotInventory_BranchId] ON [SlotInventory] ([BranchId]);");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_SlotInventory_Branch_DateTime' AND object_id = OBJECT_ID(N'SlotInventory'))
                CREATE UNIQUE INDEX [UQ_SlotInventory_Branch_DateTime] ON [SlotInventory] ([BranchId], [SlotDate], [SlotStartTime]);");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Booking_BranchId' AND object_id = OBJECT_ID(N'Booking'))
                CREATE INDEX [IX_Booking_BranchId] ON [Booking] ([BranchId]);");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Branch_IsDeleted' AND object_id = OBJECT_ID(N'Branch'))
                EXEC(N'CREATE INDEX [IX_Branch_IsDeleted] ON [Branch] ([IsDeleted]) WHERE ([IsDeleted]=(0))');");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Branch_ManagerId' AND object_id = OBJECT_ID(N'Branch'))
                CREATE INDEX [IX_Branch_ManagerId] ON [Branch] ([ManagerId]);");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UQ_Branch_Code' AND object_id = OBJECT_ID(N'Branch'))
                CREATE UNIQUE INDEX [UQ_Branch_Code] ON [Branch] ([BranchCode]);");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_BranchService_ServiceCatalogItemId' AND object_id = OBJECT_ID(N'BranchService'))
                CREATE INDEX [IX_BranchService_ServiceCatalogItemId] ON [BranchService] ([ServiceCatalogItemId]);");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Booking_Branch')
                ALTER TABLE [Booking] ADD CONSTRAINT [FK_Booking_Branch] FOREIGN KEY ([BranchId]) REFERENCES [Branch] ([BranchId]) ON DELETE NO ACTION;");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_SlotInventory_Branch')
                ALTER TABLE [SlotInventory] ADD CONSTRAINT [FK_SlotInventory_Branch] FOREIGN KEY ([BranchId]) REFERENCES [Branch] ([BranchId]) ON DELETE NO ACTION;");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_User_Branch')
                ALTER TABLE [User] ADD CONSTRAINT [FK_User_Branch] FOREIGN KEY ([BranchId]) REFERENCES [Branch] ([BranchId]) ON DELETE SET NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Booking_Branch",
                table: "Booking");

            migrationBuilder.DropForeignKey(
                name: "FK_SlotInventory_Branch",
                table: "SlotInventory");

            migrationBuilder.DropForeignKey(
                name: "FK_User_Branch",
                table: "User");

            migrationBuilder.DropTable(
                name: "BranchService");

            migrationBuilder.DropTable(
                name: "Branch");

            migrationBuilder.DropIndex(
                name: "IX_User_BranchId",
                table: "User");

            migrationBuilder.DropIndex(
                name: "IX_SlotInventory_BranchId",
                table: "SlotInventory");

            migrationBuilder.DropIndex(
                name: "UQ_SlotInventory_Branch_DateTime",
                table: "SlotInventory");

            migrationBuilder.DropIndex(
                name: "IX_Booking_BranchId",
                table: "Booking");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "User");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "SlotInventory");

            migrationBuilder.DropColumn(
                name: "BranchId",
                table: "Booking");

            migrationBuilder.Sql("ALTER TABLE [SlotInventory] ADD CONSTRAINT [UQ_SlotInventory_DateTime] UNIQUE ([SlotDate], [SlotStartTime])");
        }
    }
}
