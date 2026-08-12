namespace WashingCar_Common.Settings;

public class EmailSettings
{
    public string Server      { get; set; } = null!;
    public int    Port        { get; set; }
    public string SenderName  { get; set; } = null!;
    public string SenderEmail { get; set; } = null!;
    public string Password    { get; set; } = null!;
}
