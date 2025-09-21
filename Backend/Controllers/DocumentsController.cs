using Backend.Data;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.IO.Compression;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
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
    [Authorize]
    public async Task<IActionResult> Upload([FromForm] UploadDocumentRequest request)
    {
        HttpContext.Features.Get<IHttpMaxRequestBodySizeFeature>()!.MaxRequestBodySize = _maxFileSize * 1024 * 1024;
        if (request.File == null || request.File.Length == 0)
            return BadRequest("File is required");

        var idValue =
            User.FindFirstValue(ClaimTypes.NameIdentifier) ??
            User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value ??
            User.FindFirst("sub")?.Value ??
            User.FindFirst("id")?.Value;

        if (!int.TryParse(idValue, out var uid) || uid <= 0)
            return Unauthorized("Missing or invalid user id claim");

        var user = await _db.GetUserByIdAsync(uid);
        if (user == null)
            return Unauthorized("User does not exist");

        var savedFileName = await _fileService.SaveFileAsync(request.File);
        var fileUrl = _fileService.GetFileUrl(savedFileName);

        var document = new Document
        {
            FileName = request.File.FileName,
            FilePath = fileUrl,
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

        return Ok(new { Id = docId, FileName = savedFileName, Url = fileUrl });
    }

    [HttpGet]
    [Authorize]
    public async Task<IActionResult> GetAll()
    {
        var docs = await _db.GetAllDocumentsAsync();
        var result = docs.Select(d => new
        {
            d.Id,
            d.FileName,
            d.FilePath,
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
    [Authorize]
    public async Task<IActionResult> GetById(int id)
    {
        var doc = await _db.GetDocumentByIdAsync(id);
        if (doc == null) return NotFound();
        var result = new
        {
            doc.Id,
            doc.FileName,
            doc.FilePath,
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

    [HttpGet("download/{fileName}")]
    [Authorize]
    public IActionResult Download(string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName)) return BadRequest();
        var path = _fileService.GetPhysicalFilePath(fileName);
        if (!System.IO.File.Exists(path)) return NotFound();
        var contentType = "application/octet-stream";
        var originalName = fileName;
        var bytes = System.IO.File.ReadAllBytes(path);
        return File(bytes, contentType, originalName);
    }

    public class BulkDownloadRequest
    {
        public List<string> FileNames { get; set; } = new();
        public string? ZipName { get; set; }
    }

    [HttpPost("download/zip")]
    [Authorize]
    public async Task<IActionResult> DownloadZip([FromBody] BulkDownloadRequest request)
    {
        if (request.FileNames == null || request.FileNames.Count == 0) return BadRequest("No files specified");

        var memory = new MemoryStream();
        using (var archive = new ZipArchive(memory, ZipArchiveMode.Create, true))
        {
            foreach (var fileName in request.FileNames.Distinct())
            {
                var path = _fileService.GetPhysicalFilePath(fileName);
                if (!System.IO.File.Exists(path)) continue; // skip missing
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
    [Authorize]
    public async Task<IActionResult> Delete(string fileName)
    {
        var deleted = await _fileService.DeleteFileAsync(fileName);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
