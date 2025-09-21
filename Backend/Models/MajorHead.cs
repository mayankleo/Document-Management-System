namespace DMS_Backend.Models;

public class MajorHead
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public ICollection<MinorHead> MinorHeads { get; set; } = new List<MinorHead>();
}
