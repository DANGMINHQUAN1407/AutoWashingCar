using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using WashingCar_Domain.DTOs;

namespace WashingCar_API.Controllers;

[ApiController]
public abstract class BaseApiController : ControllerBase
{
    protected Guid CurrentUserId =>
        Guid.Parse(User.FindFirstValue(JwtRegisteredClaimNames.Sub)!);
    protected IActionResult Success<T>(T data, string? message = null)
        => Ok(ApiResponse<T>.Ok(data, message));

    protected IActionResult Success(string? message = null)
        => Ok(ApiResponse.Ok(message));

    protected IActionResult Paged<T>(PagedResult<T> result)
        => Ok(ApiResponse.Ok(result));

    protected IActionResult Created<T>(string? actionName, object? routeValues, T data, string? message = null)
        => base.CreatedAtAction(actionName, routeValues, ApiResponse<T>.Ok(data, message));
}
