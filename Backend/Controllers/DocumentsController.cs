using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.IO.Compression;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IFileService _fileService;
    private readonly AppDbContext _db;
    private readonly int _maxFileSize;

    public DocumentsController(IFileService fileService, AppDbContext db, IConfiguration config)
    {
        _fileService = fileService;
        _db = db;
        _maxFileSize = config.GetValue<int>("FileStorage:MaxFileSizeMB");
    }

    private async Task<User?> GetCurrentUserAsync()
    {
        var idValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
            User.FindFirst("sub")?.Value ??
            User.FindFirst("id")?.Value;

        if (!int.TryParse(idValue, out var uid) || uid <= 0) return null;
        return await _db.GetUserByIdAsync(uid);
    }

    private static bool UserCanAccessDocument(User user, Document doc)
    {
        if (user.IsAdmin) return true;
        // Access rule: username matches MinorHead.Name OR DepartmentID matches MinorHeadId
        var nameMatch = doc.MinorHead?.Name != null && string.Equals(doc.MinorHead.Name, user.Username, StringComparison.OrdinalIgnoreCase);
        var deptMatch = user.DepartmentID != 0 && doc.MinorHeadId == user.DepartmentID;
        return nameMatch || deptMatch;
    }

    public class UploadDocumentRequest
    {
        public IFormFile File { get; set; } = null!;
        public int MajorHeadId { get; set; }
        public int MinorHeadId { get; set; }
        public string? Remarks { get; set; }
        public DateTime? DocumentDate { get; set; }
        public List<string>? Tags { get; set; }
    }

    [HttpPost("upload")]
    [Authorize(Policy = "AdminOnly")]
    [RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] UploadDocumentRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest("File is required");

        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized("Missing or invalid user id claim");

        var savedFileName = await _fileService.SaveFileAsync(request.File);

        var document = new Document
        {
            FileOriginalName = request.File.FileName,
            FileName = savedFileName,
            ContentType = request.File.ContentType,
            Size = request.File.Length,
            MajorHeadId = request.MajorHeadId,
            MinorHeadId = request.MinorHeadId,
            Remarks = request.Remarks ?? string.Empty,
            DocumentDate = request.DocumentDate ?? DateTime.UtcNow,
            UploadedAt = DateTime.UtcNow,
            UploadedBy = user.Id
        };

        var tags = request.Tags ?? new List<string>();
        var docId = await _db.InsertDocumentAsync(document, tags);

        return Ok(new { Id = docId, FileName = savedFileName});
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var docs = await _db.GetAllDocumentsAsync();
        if (!user.IsAdmin)
        {
            docs = docs.Where(d => UserCanAccessDocument(user, d));
        }
        var result = docs.Select(d => new
        {
            d.Id,
            d.FileOriginalName,
            d.FileName,
            d.ContentType,
            d.Size,
            d.Remarks,
            d.DocumentDate,
            d.UploadedAt,
            d.UploadedBy,
            MajorHead = new { d.MajorHead.Id, d.MajorHead.Name },
            MinorHead = new { d.MinorHead.Id, d.MinorHead.MajorHeadId, d.MinorHead.Name },
            Tags = d.DocumentTags.Select(dt => dt.Tag.Name).ToList()
        });
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var doc = await _db.GetDocumentByIdAsync(id);
        if (doc == null) return NotFound();
        if (!UserCanAccessDocument(user, doc)) return Forbid();
        var result = new
        {
            doc.Id,
            doc.FileOriginalName,
            doc.FileName,
            doc.ContentType,
            doc.Size,
            doc.Remarks,
            doc.DocumentDate,
            doc.UploadedAt,
            doc.UploadedBy,
            MajorHead = new { doc.MajorHead.Id, doc.MajorHead.Name },
            MinorHead = new { doc.MinorHead.Id, doc.MinorHead.MajorHeadId, doc.MinorHead.Name },
            Tags = doc.DocumentTags.Select(dt => dt.Tag.Name).ToList()
        };
        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] int? majorHeadId, [FromQuery] int? minorHeadId, [FromQuery] DateTime? from, [FromQuery] DateTime? to, [FromQuery] string? tags)
    {
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var tagList = string.IsNullOrWhiteSpace(tags) ? null : tags.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        var docs = await _db.SearchDocumentsWithDetailsAsync(majorHeadId, minorHeadId, from, to, tagList);
        if (!user.IsAdmin)
        {
            docs = docs.Where(d => UserCanAccessDocument(user, d));
        }
        var result = docs.Select(d => new
        {
            d.Id,
            d.FileOriginalName,
            d.FileName,
            d.ContentType,
            d.Size,
            d.Remarks,
            d.DocumentDate,
            d.UploadedAt,
            d.UploadedBy,
            MajorHead = new { d.MajorHead.Id, d.MajorHead.Name },
            MinorHead = new { d.MinorHead.Id, d.MinorHead.MajorHeadId, d.MinorHead.Name },
            Tags = d.DocumentTags.Select(dt => dt.Tag.Name).ToList()
        });
        return Ok(result);
    }

    [HttpGet("tags")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> GetTags()
    {
        var tags = await _db.GetTagsAsync();
        return Ok(tags.Select(t => new { t.Id, t.Name }));
    }

    [HttpGet("download/{fileName}")]
    public async Task<IActionResult> Download(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return BadRequest();
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var doc = await _db.GetDocumentByFileNameAsync(fileName);
        if (doc == null) return NotFound();
        if (!UserCanAccessDocument(user, doc)) return Forbid();

        var path = _fileService.GetPhysicalFilePath(fileName);
        if (!System.IO.File.Exists(path)) return NotFound();
        var contentType = doc.ContentType ?? "application/octet-stream";
        var originalName = doc.FileOriginalName ?? fileName;
        var bytes = System.IO.File.ReadAllBytes(path);
        return File(bytes, contentType, originalName);
    }

    public class BulkDownloadRequest
    {
        public List<string> FileNames { get; set; } = new();
        public string? ZipName { get; set; }
    }

    [HttpPost("download/zip")]
    public async Task<IActionResult> DownloadZip([FromBody] BulkDownloadRequest request)
    {
        if (request.FileNames == null || request.FileNames.Count == 0) return BadRequest("No files specified");
        var user = await GetCurrentUserAsync();
        if (user == null) return Unauthorized();

        var docs = await _db.GetDocumentsByFileNamesAsync(request.FileNames.Distinct().ToList());
        var accessibleDocs = user.IsAdmin ? docs : docs.Where(d => UserCanAccessDocument(user, d));
        var accessibleFileNames = new HashSet<string>(accessibleDocs.Select(d => d.FileName), StringComparer.OrdinalIgnoreCase);
        if (accessibleFileNames.Count == 0) return Forbid();

        var memory = new MemoryStream();
        using (var archive = new ZipArchive(memory, ZipArchiveMode.Create, true))
        {
            foreach (var fileName in accessibleFileNames)
            {
                var path = _fileService.GetPhysicalFilePath(fileName);
                if (!System.IO.File.Exists(path)) continue;
                var entry = archive.CreateEntry(fileName, CompressionLevel.Fastest);
                await using var entryStream = entry.Open();
                await using var fileStream = System.IO.File.OpenRead(path);
                await fileStream.CopyToAsync(entryStream);
            }
        }
        memory.Position = 0;
        var zipName = string.IsNullOrWhiteSpace(request.ZipName) ? $"documents_{DateTime.UtcNow:yyyyMMddHHmmss}.zip" : request.ZipName.EndsWith(".zip", StringComparison.OrdinalIgnoreCase) ? request.ZipName : request.ZipName + ".zip";
        return File(memory, "application/zip", zipName);
    }

    [HttpDelete("{fileName}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<IActionResult> Delete(string fileName)
    {
        var deleted = await _fileService.DeleteFileAsync(fileName);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
