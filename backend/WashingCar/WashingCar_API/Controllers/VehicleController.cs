using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_API.Services;
using WashingCar_BLL.Interfaces;
using WashingCar_Common.Exceptions;
using WashingCar_Common.Enum;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_API.Controllers
{
    [Route("api/vehicles")]
    [Authorize(Roles = UserRole.Customer)]
    public class VehicleController : BaseApiController
    {
        private const long MaximumImageFileSizeBytes = 5 * 1024 * 1024;

        private static readonly HashSet<string> AllowedImageExtensions =
            new(StringComparer.OrdinalIgnoreCase) { ".jpg", ".jpeg", ".png", ".webp" };

        private static readonly HashSet<string> AllowedImageContentTypes =
            new(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/png", "image/webp" };

        private readonly IVehicleService _vehicleService;
        private readonly IVehicleImageStorage _vehicleImageStorage;

        public VehicleController(
            IVehicleService vehicleService,
            IVehicleImageStorage vehicleImageStorage)
        {
            _vehicleService = vehicleService;
            _vehicleImageStorage = vehicleImageStorage;
        }

        /// <summary>Danh sách xe của chính mình.</summary>
        /// <remarks>Gọi: VehicleService.GetMyVehiclesAsync → IVehicleRepository.GetByUserIdAsync.</remarks>
        [HttpGet]
        public async Task<IActionResult> GetMyVehicles()
        {
            var vehicles = await _vehicleService.GetMyVehiclesAsync(CurrentUserId);
            return Success(vehicles);
        }

        /// <summary>Chi tiết một xe của chính mình, kèm URL ảnh chính.</summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var vehicle = await _vehicleService.GetByIdAsync(CurrentUserId, id);
            return Success(vehicle);
        }

        /// <summary>Danh sách ảnh của xe thuộc chính khách hàng.</summary>
        [HttpGet("{id:guid}/images")]
        public async Task<IActionResult> GetImages(Guid id)
        {
            var images = await _vehicleService.GetImagesAsync(CurrentUserId, id);
            return Success(images);
        }

        /// <summary>Thêm xe mới cho chính mình.</summary>
        /// <remarks>Gọi: VehicleService.CreateAsync → IVehicleRepository.ExistsLicensePlateAsync → CreateAsync.</remarks>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateVehicleRequest request)
        {
            var vehicle = await _vehicleService.CreateAsync(CurrentUserId, request);
            return Created(nameof(GetById), new { id = vehicle.VehicleId }, vehicle, "Thêm xe thành công");
        }

        /// <summary>Tải một ảnh JPG, PNG hoặc WebP (tối đa 5 MB) cho xe của chính mình.</summary>
        [HttpPost("{id:guid}/images")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadImage(Guid id, IFormFile file)
        {
            ValidateImageFile(file);

            var imageUrl = await _vehicleImageStorage.SaveAsync(id, file, HttpContext.RequestAborted);
            try
            {
                var image = await _vehicleService.AddImageAsync(CurrentUserId, id, imageUrl);
                return Created(nameof(GetImages), new { id }, image, "Tải ảnh xe thành công");
            }
            catch
            {
                await _vehicleImageStorage.DeleteAsync(imageUrl, HttpContext.RequestAborted);
                throw;
            }
        }

        /// <summary>Cập nhật thông tin xe của chính mình.</summary>
        /// <remarks>
        /// Gọi: VehicleService.UpdateAsync → IVehicleRepository.GetByIdAsync + ExistsLicensePlateAsync → UpdateAsync.
        /// </remarks>
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateVehicleRequest request)
        {
            var vehicle = await _vehicleService.UpdateAsync(CurrentUserId, id, request);
            return Success(vehicle, "Cập nhật xe thành công");
        }

        /// <summary>Đặt một ảnh thuộc xe của chính khách hàng làm ảnh đại diện.</summary>
        [HttpPut("{id:guid}/images/{imageId:guid}/set-primary")]
        public async Task<IActionResult> SetPrimaryImage(Guid id, Guid imageId)
        {
            var image = await _vehicleService.SetPrimaryImageAsync(CurrentUserId, id, imageId);
            return Success(image, "Đã đặt ảnh đại diện cho xe");
        }

        /// <summary>Xoá ảnh xe; nếu xoá ảnh đại diện thì hệ thống tự chọn ảnh còn lại đầu tiên.</summary>
        [HttpDelete("{id:guid}/images/{imageId:guid}")]
        public async Task<IActionResult> DeleteImage(Guid id, Guid imageId)
        {
            var imageUrl = await _vehicleService.DeleteImageAsync(CurrentUserId, id, imageId);
            await _vehicleImageStorage.DeleteAsync(imageUrl, HttpContext.RequestAborted);
            return Success("Xóa ảnh xe thành công");
        }

        /// <summary>Xoá mềm xe của chính mình.</summary>
        /// <remarks>Gọi: VehicleService.DeleteAsync → IVehicleRepository.GetByIdAsync → UpdateAsync.</remarks>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _vehicleService.DeleteAsync(CurrentUserId, id);
            return Success("Xóa xe thành công");
        }

        private static void ValidateImageFile(IFormFile? file)
        {
            if (file is null || file.Length == 0)
            {
                throw AppException.BadRequest("Vui lòng chọn một ảnh xe hợp lệ.");
            }

            if (file.Length > MaximumImageFileSizeBytes)
            {
                throw AppException.BadRequest("Ảnh xe không được vượt quá 5 MB.");
            }

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedImageExtensions.Contains(extension)
                || !AllowedImageContentTypes.Contains(file.ContentType))
            {
                throw AppException.BadRequest("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.");
            }
        }
    }
}
