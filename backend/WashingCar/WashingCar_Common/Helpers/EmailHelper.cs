namespace WashingCar_Common.Helpers;

public static class EmailHelper
{
    /// <summary>
    /// Che bớt email để không lộ PII trong log.
    /// Ví dụ: "quang@gmail.com" → "q***@gmail.com"
    /// </summary>
    public static string Mask(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 1) return "***";
        return email[0] + "***" + email[at..];
    }
}
