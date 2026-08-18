SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ANSI_WARNINGS ON;
SET ANSI_PADDING ON;
GO

USE [WashingCar];
GO

-- 1. Create VehicleBodyStyleCatalog table
IF OBJECT_ID('dbo.VehicleBodyStyleCatalog', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[VehicleBodyStyleCatalog] (
        [VehicleBodyStyleCatalogId] UNIQUEIDENTIFIER NOT NULL DEFAULT (newsequentialid()),
        [Code] VARCHAR(50) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [IsActive] BIT NOT NULL DEFAULT (1),
        [LegacyEnumValue] TINYINT NULL,
        [CreatedAtUtc] DATETIME2(3) NOT NULL DEFAULT (sysutcdatetime()),
        [UpdatedAtUtc] DATETIME2(3) NULL,
        [RowVersion] TIMESTAMP NOT NULL,
        CONSTRAINT [PK_VehicleBodyStyleCatalog] PRIMARY KEY CLUSTERED ([VehicleBodyStyleCatalogId] ASC)
    );
    CREATE UNIQUE INDEX [UQ_VehicleBodyStyleCatalog_Code] ON [dbo].[VehicleBodyStyleCatalog] ([Code] ASC);
END;
GO

-- 2. Create VehicleEngineCatalog table
IF OBJECT_ID('dbo.VehicleEngineCatalog', 'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[VehicleEngineCatalog] (
        [VehicleEngineCatalogId] UNIQUEIDENTIFIER NOT NULL DEFAULT (newsequentialid()),
        [Code] VARCHAR(50) NOT NULL,
        [Name] NVARCHAR(100) NOT NULL,
        [IsActive] BIT NOT NULL DEFAULT (1),
        [LegacyEnumValue] TINYINT NULL,
        [CreatedAtUtc] DATETIME2(3) NOT NULL DEFAULT (sysutcdatetime()),
        [UpdatedAtUtc] DATETIME2(3) NULL,
        [RowVersion] TIMESTAMP NOT NULL,
        CONSTRAINT [PK_VehicleEngineCatalog] PRIMARY KEY CLUSTERED ([VehicleEngineCatalogId] ASC)
    );
    CREATE UNIQUE INDEX [UQ_VehicleEngineCatalog_Code] ON [dbo].[VehicleEngineCatalog] ([Code] ASC);
END;
GO

-- 3. Add columns to Vehicle table if they don't exist
IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'BodyStyleCatalogId' AND Object_ID = OBJECT_ID(N'dbo.Vehicle'))
BEGIN
    ALTER TABLE [dbo].[Vehicle] ADD [BodyStyleCatalogId] UNIQUEIDENTIFIER NULL;
END;
GO

IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'EngineCatalogId' AND Object_ID = OBJECT_ID(N'dbo.Vehicle'))
BEGIN
    ALTER TABLE [dbo].[Vehicle] ADD [EngineCatalogId] UNIQUEIDENTIFIER NULL;
END;
GO

-- 4. Add Indexes on Vehicle columns if they don't exist
IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_Vehicle_BodyStyleCatalogId' AND object_id = OBJECT_ID('dbo.Vehicle'))
BEGIN
    CREATE INDEX [IX_Vehicle_BodyStyleCatalogId] ON [dbo].[Vehicle] ([BodyStyleCatalogId] ASC);
END;
GO

IF NOT EXISTS(SELECT * FROM sys.indexes WHERE name = 'IX_Vehicle_EngineCatalogId' AND object_id = OBJECT_ID('dbo.Vehicle'))
BEGIN
    CREATE INDEX [IX_Vehicle_EngineCatalogId] ON [dbo].[Vehicle] ([EngineCatalogId] ASC);
END;
GO

-- 5. Add Foreign Keys if they don't exist
IF NOT EXISTS(SELECT * FROM sys.foreign_keys WHERE name = 'FK_Vehicle_BodyStyleCatalog')
BEGIN
    ALTER TABLE [dbo].[Vehicle] WITH CHECK ADD CONSTRAINT [FK_Vehicle_BodyStyleCatalog] FOREIGN KEY([BodyStyleCatalogId])
    REFERENCES [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId]);
END;
GO

IF NOT EXISTS(SELECT * FROM sys.foreign_keys WHERE name = 'FK_Vehicle_EngineCatalog')
BEGIN
    ALTER TABLE [dbo].[Vehicle] WITH CHECK ADD CONSTRAINT [FK_Vehicle_EngineCatalog] FOREIGN KEY([EngineCatalogId])
    REFERENCES [dbo].[VehicleEngineCatalog] ([VehicleEngineCatalogId]);
END;
GO

-- 6. Seed Default Catalogs
DECLARE @now DATETIME2(3) = SYSUTCDATETIME();

-- Engine types: Gasoline (1), Diesel (2), Electric (3), Hybrid (4)
IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleEngineCatalog] WHERE [Code] = 'GASOLINE')
    INSERT INTO [dbo].[VehicleEngineCatalog] ([VehicleEngineCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'GASOLINE', 'Gasoline', 1, 1, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleEngineCatalog] WHERE [Code] = 'DIESEL')
    INSERT INTO [dbo].[VehicleEngineCatalog] ([VehicleEngineCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'DIESEL', 'Diesel', 1, 2, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleEngineCatalog] WHERE [Code] = 'ELECTRIC')
    INSERT INTO [dbo].[VehicleEngineCatalog] ([VehicleEngineCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'ELECTRIC', 'Electric', 1, 3, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleEngineCatalog] WHERE [Code] = 'HYBRID')
    INSERT INTO [dbo].[VehicleEngineCatalog] ([VehicleEngineCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'HYBRID', 'Hybrid', 1, 4, @now);

-- Body styles: Sedan (1), SUV (2), Hatchback (3), Pickup (4), Van (5), Minivan (6), Coupe (7), Convertible (8)
IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'SEDAN')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'SEDAN', 'Sedan', 1, 1, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'SUV')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'SUV', 'SUV', 1, 2, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'HATCHBACK')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'HATCHBACK', 'Hatchback', 1, 3, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'PICKUP')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'PICKUP', 'Pickup', 1, 4, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'VAN')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'VAN', 'Van', 1, 5, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'MINIVAN')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'MINIVAN', 'Minivan', 1, 6, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'COUPE')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'COUPE', 'Coupe', 1, 7, @now);

IF NOT EXISTS (SELECT 1 FROM [dbo].[VehicleBodyStyleCatalog] WHERE [Code] = 'CONVERTIBLE')
    INSERT INTO [dbo].[VehicleBodyStyleCatalog] ([VehicleBodyStyleCatalogId], [Code], [Name], [IsActive], [LegacyEnumValue], [CreatedAtUtc])
    VALUES (NEWID(), 'CONVERTIBLE', 'Convertible', 1, 8, @now);

-- 7. Link existing vehicle rows
UPDATE v
SET v.EngineCatalogId = c.VehicleEngineCatalogId
FROM Vehicle v
INNER JOIN VehicleEngineCatalog c ON c.LegacyEnumValue = v.EngineType
WHERE v.EngineCatalogId IS NULL AND v.EngineType IS NOT NULL;

UPDATE v
SET v.BodyStyleCatalogId = c.VehicleBodyStyleCatalogId
FROM Vehicle v
INNER JOIN VehicleBodyStyleCatalog c ON c.LegacyEnumValue = v.BodyStyle
WHERE v.BodyStyleCatalogId IS NULL AND v.BodyStyle IS NOT NULL;

-- 8. Add record into EF Migration History
IF NOT EXISTS (SELECT 1 FROM [dbo].[__EFMigrationsHistory] WHERE [MigrationId] = '20260818025646_AddVehicleCatalogTables')
BEGIN
    INSERT INTO [dbo].[__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES ('20260818025646_AddVehicleCatalogTables', '8.0.0');
END;
GO
