using System.Diagnostics;
using System.Security.Claims;

namespace WashingCar_API.Middlewares;

public class RequestLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLoggingMiddleware> _logger;

    public RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw     = Stopwatch.StartNew();
        var method = context.Request.Method;
        var path   = context.Request.Path;

        _logger.LogInformation("[REQ] {Method} {Path}", method, path);

        await _next(context);

        sw.Stop();

        var userId = context.User.FindFirstValue("sub") ?? "anonymous";

        _logger.LogInformation(
            "[RES] {Method} {Path} | {StatusCode} | {ElapsedMs}ms | User: {UserId}",
            method, path, context.Response.StatusCode, sw.ElapsedMilliseconds, userId);
    }
}
