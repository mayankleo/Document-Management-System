namespace Backend.Services;


public interface IFileService
{
    Task<string> SaveFileAsync(IFormFile file);
    Task<bool> DeleteFileAsync(string fileName);
    string GetPhysicalFilePath(string fileName);
}



