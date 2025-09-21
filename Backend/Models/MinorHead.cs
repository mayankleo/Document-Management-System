namespace Backend.Models;

public class MinorHead
{
    public int Id { get; set; }
    public int MajorHeadId { get; set; }
    public string Name { get; set; } = null!;
}

