namespace DMS_Backend.Models;

public class Document
{
    public int Id { get; set; }
    public string FileName { get; set; } = null!;
    public string FilePath { get; set; } = null!;
    public string ContentType { get; set; } = null!;
    public long Size { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public DateTime DocumentDate { get; set; }
    public int MajorHeadId { get; set; }
    public MajorHead MajorHead { get; set; } = null!;
    public int MinorHeadId { get; set; }
    public MinorHead MinorHead { get; set; } = null!;
    public string Remarks { get; set; } = "";
    public int UploadedBy { get; set; }
    public ICollection<DocumentTag> DocumentTags { get; set; } = new List<DocumentTag>();
}

public class DocumentTag
{
    public int DocumentId { get; set; }
    public Document Document { get; set; } = null!;
    public int TagId { get; set; }
    public Tag Tag { get; set; } = null!;
}

