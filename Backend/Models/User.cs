namespace DMS_Backend.Models;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; } = null!;
    public string Mobile { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public bool IsAdmin { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
