using System.Data;
using Dapper;
using MySqlConnector;
using Backend.Models;

namespace Backend.Data;

public class AppDbContext : IDisposable
{
    private readonly IDbConnection _connection;

    public AppDbContext(IConfiguration config)
    {
        var masterConnStr = config.GetConnectionString("Master");
        using var masterConn = new MySqlConnection(masterConnStr);
        masterConn.Open();
        masterConn.Execute("CREATE DATABASE IF NOT EXISTS mydmsdb");
        var connStr = config.GetConnectionString("Default");
        _connection = new MySqlConnection(connStr);
        _connection.Open();
        InitializeTables();
    }

    public IDbConnection Connection => _connection;

    private void InitializeTables()
    {
        // Users
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS Users (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Username VARCHAR(100) NOT NULL,
                Mobile VARCHAR(20) NOT NULL UNIQUE,
                PasswordHash VARCHAR(255),
                IsAdmin BOOLEAN DEFAULT FALSE,
                CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );");

        // Tags
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS Tags (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Name VARCHAR(100) NOT NULL UNIQUE
            );");

        // MajorHeads
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS MajorHeads (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                Name VARCHAR(100) NOT NULL
            );");

        // MinorHeads
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS MinorHeads (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                MajorHeadId INT NOT NULL,
                Name VARCHAR(100) NOT NULL,
                FOREIGN KEY (MajorHeadId) REFERENCES MajorHeads(Id) ON DELETE CASCADE
            );");

        // Documents
        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS Documents (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                FileName VARCHAR(255) NOT NULL,
                FilePath VARCHAR(500) NOT NULL,
                ContentType VARCHAR(100) NOT NULL,
                Size BIGINT UNSIGNED NOT NULL,
                MajorHeadId INT NOT NULL,
                MinorHeadId INT NOT NULL,
                Remarks TEXT,
                DocumentDate DATETIME,
                UploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UploadedBy INT,
                FOREIGN KEY (MajorHeadId) REFERENCES MajorHeads(Id),
                FOREIGN KEY (MinorHeadId) REFERENCES MinorHeads(Id),
                FOREIGN KEY (UploadedBy) REFERENCES Users(Id)
            );");

        _connection.Execute(@"
            CREATE TABLE IF NOT EXISTS DocumentTags (
                DocumentId INT NOT NULL,
                TagId INT NOT NULL,
                PRIMARY KEY (DocumentId, TagId),
                FOREIGN KEY (DocumentId) REFERENCES Documents(Id) ON DELETE CASCADE,
                FOREIGN KEY (TagId) REFERENCES Tags(Id) ON DELETE CASCADE
            );");
    }

    // ---------- USERS ----------
    public async Task<User?> GetUserByMobileAsync(string mobile)
    {
        var sql = "SELECT * FROM Users WHERE Mobile = @Mobile LIMIT 1";
        return await _connection.QueryFirstOrDefaultAsync<User>(sql, new { Mobile = mobile });
    }

    public async Task<int> InsertUserAsync(User user)
    {
        var sql = @"INSERT INTO Users (Username, Mobile, PasswordHash, IsAdmin)
                    VALUES (@Username, @Mobile, @PasswordHash, @IsAdmin);
                    SELECT LAST_INSERT_ID();";
        return await _connection.ExecuteScalarAsync<int>(sql, user);
    }

    // ---------- TAGS ----------
    public async Task<IEnumerable<Tag>> GetTagsAsync()
    {
        var sql = "SELECT * FROM Tags";
        return await _connection.QueryAsync<Tag>(sql);
    }

    public async Task<int> InsertTagAsync(string tagName)
    {
        var sql = @"INSERT INTO Tags (Name) VALUES (@Name); SELECT LAST_INSERT_ID();";
        return await _connection.ExecuteScalarAsync<int>(sql, new { Name = tagName });
    }

    // ---------- MAJOR / MINOR HEADS ----------
    public async Task<IEnumerable<MajorHead>> GetMajorHeadsAsync()
    {
        var sql = "SELECT * FROM MajorHeads";
        return await _connection.QueryAsync<MajorHead>(sql);
    }

    public async Task<IEnumerable<MinorHead>> GetMinorHeadsByMajorAsync(int majorHeadId)
    {
        var sql = "SELECT * FROM MinorHeads WHERE MajorHeadId = @MajorHeadId";
        return await _connection.QueryAsync<MinorHead>(sql, new { MajorHeadId = majorHeadId });
    }

    // ---------- DOCUMENTS ----------
    public async Task<int> InsertDocumentAsync(Document doc, IEnumerable<string> tags)
    {
        using var transaction = _connection.BeginTransaction();

        try
        {
            var sqlDoc = @"INSERT INTO Documents 
                            (FileName, FilePath, ContentType, Size, UploadedBy, MajorHeadId, MinorHeadId, Remarks, UploadedAt, UploadedBy)
                           VALUES (@FileName, @FilePath, @ContentType, @Size, @UploadedBy, @MajorHeadId, @MinorHeadId, @Remarks, @UploadedAt, @UploadedBy);
                           SELECT LAST_INSERT_ID();";

            var documentId = await _connection.ExecuteScalarAsync<int>(sqlDoc, doc, transaction);

            foreach (var tagName in tags)
            {
                var tag = await _connection.QueryFirstOrDefaultAsync<Tag>(
                    "SELECT * FROM Tags WHERE Name = @Name", new { Name = tagName }, transaction);

                int tagId;
                if (tag == null)
                {
                    tagId = await InsertTagAsync(tagName);
                }
                else
                {
                    tagId = tag.Id;
                }

                await LinkDocumentTagAsync(documentId, tagId, transaction);
            }

            transaction.Commit();
            return documentId;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    // ---------- DOCUMENT TAGS ----------
    private async Task LinkDocumentTagAsync(int documentId, int tagId, IDbTransaction transaction)
    {
        var sql = @"INSERT INTO DocumentTags (DocumentId, TagId) VALUES (@DocumentId, @TagId)";
        await _connection.ExecuteAsync(sql, new { DocumentId = documentId, TagId = tagId }, transaction);
    }

    public async Task<IEnumerable<Document>> SearchDocumentsAsync(int? majorHeadId, int? minorHeadId, DateTime? from, DateTime? to, IEnumerable<string>? tags = null)
    {
        var sql = @"SELECT DISTINCT d.* 
                    FROM Documents d
                    LEFT JOIN DocumentTags dt ON d.Id = dt.DocumentId
                    LEFT JOIN Tags t ON dt.TagId = t.Id
                    WHERE (@MajorHeadId IS NULL OR d.MajorHeadId = @MajorHeadId)
                      AND (@MinorHeadId IS NULL OR d.MinorHeadId = @MinorHeadId)
                      AND (@From IS NULL OR d.UploadedAt >= @From)
                      AND (@To IS NULL OR d.UploadedAt <= @To)";

        if (tags != null && tags.Any())
        {
            sql += " AND t.Name IN @Tags";
        }

        return await _connection.QueryAsync<Document>(sql, new { MajorHeadId = majorHeadId, MinorHeadId = minorHeadId, From = from, To = to, Tags = tags });
    }

    public void Dispose()
    {
        _connection.Dispose();
    }
}
