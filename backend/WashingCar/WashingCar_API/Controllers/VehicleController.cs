using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WashingCar_BLL.Interfaces;
using WashingCar_Domain.DTOs.Vehicle;

namespace WashingCar_API.Controllers
{
    [Route("api/vehicles")]
    [Authorize]
    public class VehicleController : BaseApiController
    {
        private readonly IVehicleService _vehicleService;

        public VehicleController(IVehicleService vehicleService)
        {
            _vehicleService = vehicleService;
        }

        /// <summary>Danh sách xe của chính mình.</summary>
        /// <remarks>Gọi: VehicleService.GetMyVehiclesAsync → IVehicleRepository.GetByUserIdAsync.</remarks>
        [HttpGet]
        public async Task<IActionResult> GetMyVehicles()
        {
            var vehicles = await _vehicleService.GetMyVehiclesAsync(CurrentUserId);
            return Success(vehicles);
        }

        /// <summary>Chi tiết 1 xe của chính mình (404 nếu xe không tồn tại hoặc thuộc user khác).</summary>
        /// <remarks>Gọi: VehicleService.GetByIdAsync → IVehicleRepository.GetByIdAsync(vehicleId, userId).</remarks>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var vehicle = await _vehicleService.GetByIdAsync(CurrentUserId, id);
            return Success(vehicle);
        }

        /// <summary>Thêm xe mới cho chính mình.</summary>
        /// <remarks>Gọi: VehicleService.CreateAsync → IVehicleRepository.ExistsLicensePlateAsync → CreateAsync.</remarks>
        [HttpPost]
        public async Task<IActionResult> Create([FromBody]CreateVehicleRequest request)
        {
            var vehicle = await _vehicleService.CreateAsync(CurrentUserId, request);
            return Created(nameof(GetById), new  { id = vehicle.VehicleId }, vehicle, "Thêm xe thành công");
        }

        /// <summary>Cập nhật thông tin xe của chính mình.</summary>
        /// <remarks>
        /// Gọi: VehicleService.UpdateAsync → IVehicleRepository.GetByIdAsync + ExistsLicensePlateAsync → UpdateAsync.
        /// </remarks>
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody]UpdateVehicleRequest request)
        {
            var vehicle = await _vehicleService.UpdateAsync(CurrentUserId, id, request);
            return Success(vehicle, "Cập nhật xe thành công");
        }

        /// <summary>Xoá mềm xe của chính mình.</summary>
        /// <remarks>Gọi: VehicleService.DeleteAsync → IVehicleRepository.GetByIdAsync → UpdateAsync.</remarks>
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _vehicleService.DeleteAsync(CurrentUserId, id);
            return Success( "Xóa xe thành công");
        }
    }
}
