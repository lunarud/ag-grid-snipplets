using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Json;

// Base cache document model
public class CacheDocument
{
    [BsonId]
    public ObjectId Id { get; set; }
    
    [BsonElement("cacheKey")]
    public string CacheKey { get; set; }
    
    [BsonElement("documentType")]
    public string DocumentType { get; set; }
    
    [BsonElement("data")]
    public BsonDocument Data { get; set; }
    
    [BsonElement("createdAt")]
    public DateTime CreatedAt { get; set; }
    
    [BsonElement("expiresAt")]
    public DateTime? ExpiresAt { get; set; }
    
    [BsonElement("metadata")]
    public Dictionary<string, object> Metadata { get; set; } = new Dictionary<string, object>();
}

// Generic cache entry for strongly typed operations
public class CacheEntry<T>
{
    public string Key { get; set; }
    public T Value { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new Dictionary<string, object>();
}

// Cache configuration options
public class CacheOptions
{
    public string ConnectionString { get; set; } = "mongodb://localhost:27017";
    public string DatabaseName { get; set; } = "CacheDB";
    public string CollectionName { get; set; } = "Documents";
    public TimeSpan? DefaultExpiration { get; set; } = TimeSpan.FromHours(1);
    public bool EnableIndexes { get; set; } = true;
}

// Main MongoDB cache interface
public interface IMongoDocumentCache
{
    Task<bool> SetAsync<T>(string key, T document, TimeSpan? expiration = null, Dictionary<string, object> metadata = null);
    Task<T> GetAsync<T>(string key) where T : class;
    Task<CacheEntry<T>> GetWithMetadataAsync<T>(string key) where T : class;
    Task<bool> ExistsAsync(string key);
    Task<bool> DeleteAsync(string key);
    Task<long> DeleteByTypeAsync(string documentType);
    Task<List<string>> GetKeysByTypeAsync(string documentType);
    Task<Dictionary<string, object>> GetMetadataAsync(string key);
    Task<bool> UpdateMetadataAsync(string key, Dictionary<string, object> metadata);
    Task ClearExpiredAsync();
    Task<long> GetCountAsync();
    Task<long> GetCountByTypeAsync(string documentType);
}

// MongoDB cache implementation
public class MongoDocumentCache : IMongoDocumentCache
{
    private readonly IMongoCollection<CacheDocument> _collection;
    private readonly CacheOptions _options;

    public MongoDocumentCache(CacheOptions options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        
        var client = new MongoClient(_options.ConnectionString);
        var database = client.GetDatabase(_options.DatabaseName);
        _collection = database.GetCollection<CacheDocument>(_options.CollectionName);
        
        if (_options.EnableIndexes)
        {
            CreateIndexesAsync().GetAwaiter().GetResult();
        }
    }

    private async Task CreateIndexesAsync()
    {
        var indexKeys = Builders<CacheDocument>.IndexKeys;
        var indexOptions = new CreateIndexOptions();

        // Index on cache key (unique)
        await _collection.Indexes.CreateOneAsync(
            new CreateIndexModel<CacheDocument>(indexKeys.Ascending(x => x.CacheKey), 
            new CreateIndexOptions { Unique = true }));

        // Index on document type
        await _collection.Indexes.CreateOneAsync(
            new CreateIndexModel<CacheDocument>(indexKeys.Ascending(x => x.DocumentType)));

        // TTL index on expiration
        await _collection.Indexes.CreateOneAsync(
            new CreateIndexModel<CacheDocument>(indexKeys.Ascending(x => x.ExpiresAt), 
            new CreateIndexOptions { ExpireAfter = TimeSpan.Zero }));

        // Compound index for type + expiration queries
        await _collection.Indexes.CreateOneAsync(
            new CreateIndexModel<CacheDocument>(
                indexKeys.Ascending(x => x.DocumentType).Ascending(x => x.ExpiresAt)));
    }

    public async Task<bool> SetAsync<T>(string key, T document, TimeSpan? expiration = null, Dictionary<string, object> metadata = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("Cache key cannot be null or empty", nameof(key));

        if (document == null)
            throw new ArgumentNullException(nameof(document));

        var now = DateTime.UtcNow;
        var expiresAt = expiration.HasValue ? now.Add(expiration.Value) : 
                       _options.DefaultExpiration.HasValue ? now.Add(_options.DefaultExpiration.Value) : (DateTime?)null;

        var documentType = typeof(T).Name;
        var jsonData = JsonSerializer.Serialize(document);
        var bsonData = BsonDocument.Parse(jsonData);

        var cacheDoc = new CacheDocument
        {
            CacheKey = key,
            DocumentType = documentType,
            Data = bsonData,
            CreatedAt = now,
            ExpiresAt = expiresAt,
            Metadata = metadata ?? new Dictionary<string, object>()
        };

        try
        {
            await _collection.ReplaceOneAsync(
                Builders<CacheDocument>.Filter.Eq(x => x.CacheKey, key),
                cacheDoc,
                new ReplaceOptions { IsUpsert = true });
            return true;
        }
        catch (Exception)
        {
            return false;
        }
    }

    public async Task<T> GetAsync<T>(string key) where T : class
    {
        var entry = await GetWithMetadataAsync<T>(key);
        return entry?.Value;
    }

    public async Task<CacheEntry<T>> GetWithMetadataAsync<T>(string key) where T : class
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var filter = Builders<CacheDocument>.Filter.And(
            Builders<CacheDocument>.Filter.Eq(x => x.CacheKey, key),
            Builders<CacheDocument>.Filter.Or(
                Builders<CacheDocument>.Filter.Eq(x => x.ExpiresAt, null),
                Builders<CacheDocument>.Filter.Gt(x => x.ExpiresAt, DateTime.UtcNow)
            )
        );

        var cacheDoc = await _collection.Find(filter).FirstOrDefaultAsync();
        if (cacheDoc == null)
            return null;

        try
        {
            var json = cacheDoc.Data.ToJson();
            var document = JsonSerializer.Deserialize<T>(json);
            
            return new CacheEntry<T>
            {
                Key = key,
                Value = document,
                CreatedAt = cacheDoc.CreatedAt,
                ExpiresAt = cacheDoc.ExpiresAt,
                Metadata = cacheDoc.Metadata
            };
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return false;

        var filter = Builders<CacheDocument>.Filter.And(
            Builders<CacheDocument>.Filter.Eq(x => x.CacheKey, key),
            Builders<CacheDocument>.Filter.Or(
                Builders<CacheDocument>.Filter.Eq(x => x.ExpiresAt, null),
                Builders<CacheDocument>.Filter.Gt(x => x.ExpiresAt, DateTime.UtcNow)
            )
        );

        var count = await _collection.CountDocumentsAsync(filter);
        return count > 0;
    }

    public async Task<bool> DeleteAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return false;

        var result = await _collection.DeleteOneAsync(
            Builders<CacheDocument>.Filter.Eq(x => x.CacheKey, key));
        
        return result.DeletedCount > 0;
    }

    public async Task<long> DeleteByTypeAsync(string documentType)
    {
        if (string.IsNullOrWhiteSpace(documentType))
            return 0;

        var result = await _collection.DeleteManyAsync(
            Builders<CacheDocument>.Filter.Eq(x => x.DocumentType, documentType));
        
        return result.DeletedCount;
    }

    public async Task<List<string>> GetKeysByTypeAsync(string documentType)
    {
        if (string.IsNullOrWhiteSpace(documentType))
            return new List<string>();

        var filter = Builders<CacheDocument>.Filter.And(
            Builders<CacheDocument>.Filter.Eq(x => x.DocumentType, documentType),
            Builders<CacheDocument>.Filter.Or(
                Builders<CacheDocument>.Filter.Eq(x => x.ExpiresAt, null),
                Builders<CacheDocument>.Filter.Gt(x => x.ExpiresAt, DateTime.UtcNow)
            )
        );

        var projection = Builders<CacheDocument>.Projection.Include(x => x.CacheKey);
        var documents = await _collection.Find(filter).Project(projection).ToListAsync();
        
        return documents.Select(doc => doc["cacheKey"].AsString).ToList();
    }

    public async Task<Dictionary<string, object>> GetMetadataAsync(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
            return null;

        var filter = Builders<CacheDocument>.Filter.Eq(x => x.CacheKey, key);
        var projection = Builders<CacheDocument>.Projection.Include(x => x.Metadata);
        var document = await _collection.Find(filter).Project(projection).FirstOrDefaultAsync();
        
        return document?["metadata"]?.AsBsonDocument?.ToDictionary(x => x.Name, x => (object)x.Value);
    }

    public async Task<bool> UpdateMetadataAsync(string key, Dictionary<string, object> metadata)
    {
        if (string.IsNullOrWhiteSpace(key) || metadata == null)
            return false;

        var update = Builders<CacheDocument>.Update.Set(x => x.Metadata, metadata);
        var result = await _collection.UpdateOneAsync(
            Builders<CacheDocument>.Filter.Eq(x => x.CacheKey, key), update);
        
        return result.ModifiedCount > 0;
    }

    public async Task ClearExpiredAsync()
    {
        var filter = Builders<CacheDocument>.Filter.And(
            Builders<CacheDocument>.Filter.Ne(x => x.ExpiresAt, null),
            Builders<CacheDocument>.Filter.Lt(x => x.ExpiresAt, DateTime.UtcNow)
        );

        await _collection.DeleteManyAsync(filter);
    }

    public async Task<long> GetCountAsync()
    {
        var filter = Builders<CacheDocument>.Filter.Or(
            Builders<CacheDocument>.Filter.Eq(x => x.ExpiresAt, null),
            Builders<CacheDocument>.Filter.Gt(x => x.ExpiresAt, DateTime.UtcNow)
        );

        return await _collection.CountDocumentsAsync(filter);
    }

    public async Task<long> GetCountByTypeAsync(string documentType)
    {
        if (string.IsNullOrWhiteSpace(documentType))
            return 0;

        var filter = Builders<CacheDocument>.Filter.And(
            Builders<CacheDocument>.Filter.Eq(x => x.DocumentType, documentType),
            Builders<CacheDocument>.Filter.Or(
                Builders<CacheDocument>.Filter.Eq(x => x.ExpiresAt, null),
                Builders<CacheDocument>.Filter.Gt(x => x.ExpiresAt, DateTime.UtcNow)
            )
        );

        return await _collection.CountDocumentsAsync(filter);
    }
}

// Example usage and test models
public class UserProfile
{
    public int UserId { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public DateTime LastLoginAt { get; set; }
    public List<string> Roles { get; set; } = new List<string>();
}

public class ProductInfo
{
    public string ProductId { get; set; }
    public string Name { get; set; }
    public decimal Price { get; set; }
    public string Category { get; set; }
    public Dictionary<string, object> Specifications { get; set; } = new Dictionary<string, object>();
}

// Example usage class
public class CacheUsageExamples
{
    private readonly IMongoDocumentCache _cache;

    public CacheUsageExamples(IMongoDocumentCache cache)
    {
        _cache = cache;
    }

    public async Task DemonstrateUsage()
    {
        // Store different document types
        var userProfile = new UserProfile
        {
            UserId = 123,
            Username = "john_doe",
            Email = "john@example.com",
            LastLoginAt = DateTime.UtcNow,
            Roles = new List<string> { "user", "premium" }
        };

        var product = new ProductInfo
        {
            ProductId = "PROD-001",
            Name = "Wireless Headphones",
            Price = 99.99m,
            Category = "Electronics",
            Specifications = new Dictionary<string, object>
            {
                { "Battery Life", "20 hours" },
                { "Wireless", true },
                { "Color", "Black" }
            }
        };

        // Store with metadata
        var metadata = new Dictionary<string, object>
        {
            { "source", "user_service" },
            { "version", "1.0" },
            { "priority", "high" }
        };

        // Cache the documents
        await _cache.SetAsync("user:123", userProfile, TimeSpan.FromMinutes(30), metadata);
        await _cache.SetAsync("product:PROD-001", product, TimeSpan.FromHours(2));

        // Retrieve documents
        var cachedUser = await _cache.GetAsync<UserProfile>("user:123");
        var cachedProduct = await _cache.GetWithMetadataAsync<ProductInfo>("product:PROD-001");

        // Query operations
        var userKeys = await _cache.GetKeysByTypeAsync("UserProfile");
        var productCount = await _cache.GetCountByTypeAsync("ProductInfo");
        
        // Cleanup expired entries
        await _cache.ClearExpiredAsync();
    }
}
