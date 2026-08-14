using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;

namespace WashingCar_API.Services;

public sealed class LocalVehicleImageStorage : IVehicleImageStorage
{
    private const string UploadRootSegment = "uploads/vehicles";

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<LocalVehicleImageStorage> _logger;

    public LocalVehicleImageStorage(
        IWebHostEnvironment environment,
        ILogger<LocalVehicleImageStorage> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    public async Task<string> SaveAsync(
        Guid vehicleId,
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var fileName = $"{Guid.NewGuid():N}{extension}";
        var relativeDirectory = Path.Combine(UploadRootSegment, vehicleId.ToString("N"));
        var directoryPath = Path.Combine(GetWebRootPath(), relativeDirectory);

        Directory.CreateDirectory(directoryPath);

        var physicalPath = Path.Combine(directoryPath, fileName);
        await using var targetStream = new FileStream(
            physicalPath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            bufferSize: 81920,
            useAsync: true);

        await file.CopyToAsync(targetStream, cancellationToken);

        return $"/{UploadRootSegment.Replace(Path.DirectorySeparatorChar, '/')}/{vehicleId:N}/{fileName}";
    }

    public Task DeleteAsync(string imageUrl, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(imageUrl)
            || !imageUrl.StartsWith($"/{UploadRootSegment}/", StringComparison.OrdinalIgnoreCase))
        {
            return Task.CompletedTask;
        }

        var uploadRootPath = Path.GetFullPath(Path.Combine(GetWebRootPath(), UploadRootSegment));
        var relativePath = imageUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var physicalPath = Path.GetFullPath(Path.Combine(GetWebRootPath(), relativePath));

        var rootWithSeparator = uploadRootPath + Path.DirectorySeparatorChar;
        if (!physicalPath.StartsWith(rootWithSeparator, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Rejected an invalid vehicle image deletion path: {ImageUrl}", imageUrl);
            return Task.CompletedTask;
        }

        if (File.Exists(physicalPath))
        {
            File.Delete(physicalPath);
        }

        return Task.CompletedTask;
    }

    private string GetWebRootPath()
        => string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
}
