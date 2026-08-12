using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using System.Text;

namespace WashingCar_API.Middlewares
{
    public class IdempotencyMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;

        //Áp dụng cho các endpoint bookings,payments
        private static readonly HashSet<string> _protectedPaths =
            new(StringComparer.OrdinalIgnoreCase)
            {
                "/api/bookings",
                "/api/bookings/walk-in",
                "/api/payments/deposit",
                "/api/payments/counter-qr",
                "/api/payments/final"
            };

        public IdempotencyMiddleware(RequestDelegate next, IMemoryCache cache)
        {
            _next = next;
            _cache = cache;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Chặn POST request trên các path được bảo vệ
            if (context.Request.Method != HttpMethods.Post
                || !_protectedPaths.Contains(context.Request.Path.Value ?? ""))
            {
                await _next(context);
                return;
            }

            if (!context.Request.Headers.TryGetValue("Idempotency-Key", out var idempotencyKey))
            {
                context.Response.StatusCode = StatusCodes.Status400BadRequest;
                await context.Response.WriteAsJsonAsync(new { error = "Idempotency-Key header is required." });
                return;
            }

            var cacheKey = $"idempotency:{context.Request.Path}:{idempotencyKey}";

            // Đã có response cached -> trả lại 
            if (_cache.TryGetValue(cacheKey, out CachedResponse? cached) && cached is not null)
            {
                context.Response.StatusCode = cached.StatusCode;
                context.Response.ContentType = cached.ContentType;
                context.Response.Headers["X-Idempotent-Replayed"] = "true";
                await context.Response.Body.WriteAsync(cached.Body);
                return;
            }

            //Thay body stream để đọc được response
            var originalBody = context.Response.Body;
            using var buffer = new MemoryStream();
            context.Response.Body = buffer;

            try
            {
                await _next(context);
            }
            finally
            {
                // Luôn restore body kể cả khi exception — để ExceptionHandlingMiddleware ghi được error message
                buffer.Position = 0;
                await buffer.CopyToAsync(originalBody);
                context.Response.Body = originalBody;
            }

            // Chỉ cache khi thành công (2xx)
            if (context.Response.StatusCode >= 200 && context.Response.StatusCode < 300)
            {
                var bodyBytes = buffer.ToArray();
                _cache.Set(cacheKey, new CachedResponse
                {
                    StatusCode  = context.Response.StatusCode,
                    ContentType = context.Response.ContentType ?? "application/json",
                    Body        = bodyBytes,
                }, TimeSpan.FromMinutes(5));
            }
        }

        private sealed class CachedResponse
        {
            public int StatusCode { get; set; }
            public string ContentType { get; set; } = "";
            public byte[] Body { get; set; } = [];
        }
    }
}

