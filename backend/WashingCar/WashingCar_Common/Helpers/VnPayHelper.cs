using System.Net;
using System.Security.Cryptography;
using System.Text;
using WashingCar_Common.Settings;

namespace WashingCar_Common.Helpers;

/// <summary>
/// Tiện ích tích hợp cổng VNPay (sandbox v2.1.0): dựng URL thanh toán + ký/verify HMAC-SHA512.
/// Theo mẫu chính thức của VNPay (key &amp; value đều url-encode, sort theo Ordinal).
/// ⚠️ Đối chiếu lại spec param/encode với tài liệu VNPay khi nâng version.
/// </summary>
public static class VnPayHelper
{
    /// <summary>Sinh mã giao dịch (vnp_TxnRef) duy nhất — lưu vào Payment.TransactionCode.</summary>
    public static string NewTxnRef()
        => DateTime.UtcNow.ToString("yyyyMMddHHmmssfff") + Random.Shared.Next(1000, 9999);

    /// <summary>Dựng URL redirect sang VNPay. amount tính theo VND (sẽ ×100 theo yêu cầu VNPay).</summary>
    public static string CreatePaymentUrl(
        VnPaySettings s, string txnRef, decimal amount, string orderInfo, string ipAddress, string? frontendUrl = null)
    {
        var createDate = DateTime.UtcNow.AddHours(7); // giờ VN (GMT+7)

        var returnUrl = s.ReturnUrl;
        if (!string.IsNullOrEmpty(frontendUrl))
        {
            var separator = s.ReturnUrl.Contains('?') ? "&" : "?";
            returnUrl = $"{s.ReturnUrl}{separator}frontendUrl={WebUtility.UrlEncode(frontendUrl)}";
        }

        var data = new SortedDictionary<string, string>(StringComparer.Ordinal)
        {
            ["vnp_Version"]    = s.Version,
            ["vnp_Command"]    = s.Command,
            ["vnp_TmnCode"]    = s.TmnCode,
            ["vnp_Amount"]     = ((long)(amount * 100)).ToString(),
            ["vnp_CurrCode"]   = s.CurrCode,
            ["vnp_TxnRef"]     = txnRef,
            ["vnp_OrderInfo"]  = orderInfo,
            ["vnp_OrderType"]  = "other",
            ["vnp_Locale"]     = s.Locale,
            ["vnp_ReturnUrl"]  = returnUrl,
            ["vnp_IpAddr"]     = ipAddress,
            ["vnp_CreateDate"] = createDate.ToString("yyyyMMddHHmmss"),
        };

        var query      = BuildUrlQuery(data);
        var secureHash = HmacSha512(s.HashSecret, query);
        return $"{s.BaseUrl}?{query}&vnp_SecureHash={secureHash}";
    }

    /// <summary>
    /// Verify chữ ký trả về từ VNPay (Return/IPN).
    /// vnpParams phải là raw URL-encoded values (không decode trước) để hash khớp chính xác với VNPay.
    /// </summary>
    public static bool ValidateSignature(
        IDictionary<string, string> vnpParams, string receivedHash, string hashSecret)
    {
        var data = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var (k, v) in vnpParams)
        {
            if (k is "vnp_SecureHash" or "vnp_SecureHashType") continue;
            if (!string.IsNullOrEmpty(v) && k.StartsWith("vnp_", StringComparison.Ordinal))
                data[k] = v;
        }

        // Giữ nguyên raw values — không encode lại, tránh mismatch %20 vs +
        var sb = new StringBuilder();
        foreach (var (k, v) in data)
        {
            if (string.IsNullOrEmpty(v)) continue;
            if (sb.Length > 0) sb.Append('&');
            sb.Append(k).Append('=').Append(v);
        }

        var computed = HmacSha512(hashSecret, sb.ToString());
        return string.Equals(computed, receivedHash, StringComparison.OrdinalIgnoreCase);
    }

    private static string BuildUrlQuery(SortedDictionary<string, string> data)
    {
        var sb = new StringBuilder();
        foreach (var (k, v) in data)
        {
            if (string.IsNullOrEmpty(v)) continue;
            if (sb.Length > 0) sb.Append('&');
            sb.Append(WebUtility.UrlEncode(k)).Append('=').Append(WebUtility.UrlEncode(v));
        }
        return sb.ToString();
    }

    private static string HmacSha512(string key, string data)
    {
        using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(key));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var sb = new StringBuilder(hash.Length * 2);
        foreach (var b in hash) sb.Append(b.ToString("x2"));
        return sb.ToString();
    }
}
