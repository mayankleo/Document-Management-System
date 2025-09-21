namespace Backend.Services;

using Microsoft.AspNetCore.Hosting;

public class FileService : IFileService
{
    private readonly string _uploadsPath;
    private readonly long _maxFileSize;
    private readonly IWebHostEnvironment _env;

    public FileService(IConfiguration config, IWebHostEnvironment env)
    {
        _env = env;
        var basePath = env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        Directory.CreateDirectory(basePath);
        _uploadsPath = Path.Combine(basePath,(config["FileStorage:UploadsPath"]));
        _maxFileSize = (long.Parse(config["FileStorage:MaxFileSizeMB"] ?? "10")) * 1024 * 1024;

        if (!Directory.Exists(_uploadsPath))
            Directory.CreateDirectory(_uploadsPath);
    }

    public async Task<string> SaveFileAsync(IFormFile file)
    {
        if (file.Length > _maxFileSize)
            throw new InvalidOperationException("File size exceeds the maximum allowed limit.");

        var fileName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
        var filePath = Path.Combine(_uploadsPath, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return fileName;
    }

    public async Task<bool> DeleteFileAsync(string fileName)
    {
        var filePath = Path.Combine(_uploadsPath, fileName);
        if (File.Exists(filePath))
        {
            await Task.Run(() => File.Delete(filePath));
            return true;
        }
        return false;
    }

    public string GetFileUrl(string fileName)
    {
        return $"/uploads/{fileName}";
    }
}


