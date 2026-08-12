namespace WashingCar_Common.Exceptions;

/// <summary>
/// Exception có kèm HTTP status code — controller/middleware bắt rồi trả về đúng status.
/// Chỉ tạo qua factory method (constructor private) để tránh gán status code tùy tiện.
/// </summary>
public class AppException : Exception
{
    public int StatusCode { get; }

    private AppException(string message, int statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }

    // Các factory method tiện dùng — mỗi method tương ứng đúng 1 HTTP status code chuẩn REST.
    /// <summary>400 — request sai định dạng/thiếu field (thường đã bị [ApiController] chặn tự động qua DataAnnotations trước khi tới đây).</summary>
    public static AppException BadRequest(string message)        => new(message, 400);
    /// <summary>401 — chưa xác thực hoặc token không hợp lệ/hết hạn.</summary>
    public static AppException Unauthorized(string message)      => new(message, 401);
    /// <summary>403 — đã xác thực nhưng không có quyền thực hiện hành động.</summary>
    public static AppException Forbidden(string message)         => new(message, 403);
    /// <summary>404 — không tìm thấy resource.</summary>
    public static AppException NotFound(string message)          => new(message, 404);
    /// <summary>409 — xung đột trạng thái hiện tại của resource (trùng dữ liệu, concurrency).</summary>
    public static AppException Conflict(string message)          => new(message, 409);
}
