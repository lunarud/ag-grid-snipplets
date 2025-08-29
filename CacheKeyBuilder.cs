// 1. Cache Key Strategy
public static class CacheKeyBuilder
{
    private const string SEPARATOR = ":";
    
    public static string BuildKey(string prefix, params object[] keyParts)
    {
        var sanitizedParts = keyParts
            .Where(p => p != null)
            .Select(p => p.ToString().Replace(SEPARATOR, "_"))
            .ToArray();
            
        return $"{prefix}{SEPARATOR}{string.Join(SEPARATOR, sanitizedParts)}";
    }
    
    public static string UserAnalytics(string userId, DateTime? fromDate = null)
    {
        return fromDate.HasValue 
            ? BuildKey("user_analytics", userId, fromDate.Value.ToString("yyyyMMdd"))
            : BuildKey("user_analytics", userId);
    }
    
    public static string OrderSummary(DateTime startDate, DateTime endDate, string? tenantId = null)
    {
        return BuildKey("order_summary", startDate.ToString("yyyyMMdd"), 
                       endDate.ToString("yyyyMMdd"), tenantId ?? "default");
    }
    
    public static string AggregationResult(string collection, string operation, params object[] parameters)
    {
        return BuildKey($"agg_{collection}_{operation}", parameters);
    }
}

// 2. Cache Configuration
public class CacheOptions
{
    public TimeSpan DefaultExpiration { get; set; } = TimeSpan.FromMinutes(15);
    public TimeSpan SlidingExpiration { get; set; } = TimeSpan.FromMinutes(5);
    public bool EnableInMemoryCache { get; set; } = true;
    public bool EnableDistributedCache { get; set; } = true;
    public int MaxMemoryCacheSize { get; set; } = 1000;
}

// 3. Multi-Level Cache Service
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null);
    Task RemoveAsync(string key);
    Task RemoveByPatternAsync(string pattern);
    void Set<T>(string key, T value, TimeSpan? expiration = null); // Synchronous for request-scoped cache
    T? Get<T>(string key); // Synchronous for request-scoped cache
}

public class MultiLevelCacheService : ICacheService, IDisposable
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly CacheOptions _options;
    private readonly ILogger<MultiLevelCacheService> _logger;
    
    // Request-scoped cache (L1)
    private readonly ConcurrentDictionary<string, (object Value, DateTime Expiry)> _requestCache = new();
    
    public MultiLevelCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        IOptions<CacheOptions> options,
        ILogger<MultiLevelCacheService> logger)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _options = options.Value;
        _logger = logger;
    }

    // Request-scoped cache (fastest, cleared after request)
    public T? Get<T>(string key)
    {
        if (_requestCache.TryGetValue(key, out var cached))
        {
            if (DateTime.UtcNow < cached.Expiry)
            {
                _logger.LogDebug("Cache HIT (Request): {Key}", key);
                return (T)cached.Value;
            }
            _requestCache.TryRemove(key, out _);
        }
        return default(T);
    }

    public void Set<T>(string key, T value, TimeSpan? expiration = null)
    {
        var expiry = DateTime.UtcNow.Add(expiration ?? _options.DefaultExpiration);
        _requestCache[key] = (value, expiry);
        _logger.LogDebug("Cache SET (Request): {Key}", key);
    }

    // Multi-level async cache
    public async Task<T?> GetAsync<T>(string key)
    {
        // L1: Request-scoped cache
        var requestResult = Get<T>(key);
        if (requestResult != null)
        {
            return requestResult;
        }

        // L2: Memory cache
        if (_options.EnableInMemoryCache && _memoryCache.TryGetValue(key, out T memoryResult))
        {
            _logger.LogDebug("Cache HIT (Memory): {Key}", key);
            Set(key, memoryResult); // Populate L1
            return memoryResult;
        }

        // L3: Distributed cache
        if (_options.EnableDistributedCache)
        {
            var distributedResult = await GetFromDistributedCacheAsync<T>(key);
            if (distributedResult != null)
            {
                _logger.LogDebug("Cache HIT (Distributed): {Key}", key);
                
                // Populate L2 and L1
                _memoryCache.Set(key, distributedResult, _options.SlidingExpiration);
                Set(key, distributedResult);
                
                return distributedResult;
            }
        }

        _logger.LogDebug("Cache MISS: {Key}", key);
        return default(T);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
    {
        var exp = expiration ?? _options.DefaultExpiration;
        
        // Set in all cache levels
        Set(key, value, exp);
        
        if (_options.EnableInMemoryCache)
        {
            _memoryCache.Set(key, value, exp);
        }
        
        if (_options.EnableDistributedCache)
        {
            await SetInDistributedCacheAsync(key, value, exp);
        }
        
        _logger.LogDebug("Cache SET (All Levels): {Key}", key);
    }

    public async Task RemoveAsync(string key)
    {
        _requestCache.TryRemove(key, out _);
        _memoryCache.Remove(key);
        
        if (_options.EnableDistributedCache)
        {
            await _distributedCache.RemoveAsync(key);
        }
        
        _logger.LogDebug("Cache REMOVE: {Key}", key);
    }

    public async Task RemoveByPatternAsync(string pattern)
    {
        // Remove from request cache
        var keysToRemove = _requestCache.Keys.Where(k => IsMatch(k, pattern)).ToList();
        foreach (var key in keysToRemove)
        {
            _requestCache.TryRemove(key, out _);
        }

        // Note: Memory cache and Redis pattern removal would need custom implementation
        // This is a simplified version
        _logger.LogDebug("Cache REMOVE BY PATTERN: {Pattern}", pattern);
    }

    private async Task<T?> GetFromDistributedCacheAsync<T>(string key)
    {
        try
        {
            var json = await _distributedCache.GetStringAsync(key);
            return json != null ? JsonSerializer.Deserialize<T>(json) : default(T);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get from distributed cache: {Key}", key);
            return default(T);
        }
    }

    private async Task SetInDistributedCacheAsync<T>(string key, T value, TimeSpan expiration)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            await _distributedCache.SetStringAsync(key, json, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set distributed cache: {Key}", key);
        }
    }

    private static bool IsMatch(string key, string pattern)
    {
        // Simple pattern matching - could use regex for more complex patterns
        return pattern.EndsWith("*") ? key.StartsWith(pattern[..^1]) : key == pattern;
    }

    public void Dispose()
    {
        _requestCache.Clear();
    }
}

// 4. Cache-Aware Repository Pattern
public interface ICachedRepository<T>
{
    Task<List<T>> GetAggregatedAsync(string cacheKey, Func<Task<List<T>>> aggregationFunc, TimeSpan? expiration = null);
    Task<T?> GetSingleAsync(string cacheKey, Func<Task<T?>> queryFunc, TimeSpan? expiration = null);
    Task InvalidateCacheAsync(params string[] patterns);
}

public class CachedMongoRepository<T> : ICachedRepository<T>
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<CachedMongoRepository<T>> _logger;

    public CachedMongoRepository(ICacheService cacheService, ILogger<CachedMongoRepository<T>> logger)
    {
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<List<T>> GetAggregatedAsync(
        string cacheKey, 
        Func<Task<List<T>>> aggregationFunc, 
        TimeSpan? expiration = null)
    {
        // Try cache first
        var cached = await _cacheService.GetAsync<List<T>>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        // Execute aggregation
        _logger.LogInformation("Executing aggregation for cache key: {CacheKey}", cacheKey);
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        var result = await aggregationFunc();
        
        stopwatch.Stop();
        _logger.LogInformation("Aggregation completed in {ElapsedMs}ms for key: {CacheKey}", 
                              stopwatch.ElapsedMilliseconds, cacheKey);

        // Cache the result
        await _cacheService.SetAsync(cacheKey, result, expiration);
        
        return result;
    }

    public async Task<T?> GetSingleAsync(
        string cacheKey, 
        Func<Task<T?>> queryFunc, 
        TimeSpan? expiration = null)
    {
        var cached = await _cacheService.GetAsync<T>(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        var result = await queryFunc();
        if (result != null)
        {
            await _cacheService.SetAsync(cacheKey, result, expiration);
        }

        return result;
    }

    public async Task InvalidateCacheAsync(params string[] patterns)
    {
        foreach (var pattern in patterns)
        {
            await _cacheService.RemoveByPatternAsync(pattern);
        }
    }
}

// 5. Enhanced Analytics Service with Caching
public class CachedAnalyticsService : IAnalyticsService
{
    private readonly IMongoCollection<User> _users;
    private readonly IMongoCollection<Order> _orders;
    private readonly ICachedRepository<UserAnalytics> _userAnalyticsRepo;
    private readonly ICachedRepository<OrderSummary> _orderSummaryRepo;
    private readonly ICacheService _cacheService;
    private readonly ILogger<CachedAnalyticsService> _logger;

    public CachedAnalyticsService(
        IMongoDatabase database,
        ICachedRepository<UserAnalytics> userAnalyticsRepo,
        ICachedRepository<OrderSummary> orderSummaryRepo,
        ICacheService cacheService,
        ILogger<CachedAnalyticsService> logger)
    {
        _users = database.GetCollection<User>("users");
        _orders = database.GetCollection<Order>("orders");
        _userAnalyticsRepo = userAnalyticsRepo;
        _orderSummaryRepo = orderSummaryRepo;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<List<UserAnalytics>> GetUserAnalyticsAsync(string userId)
    {
        var cacheKey = CacheKeyBuilder.UserAnalytics(userId);
        
        return await _userAnalyticsRepo.GetAggregatedAsync(
            cacheKey,
            () => ExecuteUserAnalyticsAggregation(userId),
            TimeSpan.FromMinutes(30) // User analytics can be cached longer
        );
    }

    public async Task<List<OrderSummary>> GetOrderSummaryAsync(DateTime startDate, DateTime endDate)
    {
        var cacheKey = CacheKeyBuilder.OrderSummary(startDate, endDate);
        
        return await _orderSummaryRepo.GetAggregatedAsync(
            cacheKey,
            () => ExecuteOrderSummaryAggregation(startDate, endDate),
            TimeSpan.FromMinutes(5) // Order summaries need fresher data
        );
    }

    // Cache invalidation when data changes
    public async Task InvalidateUserCacheAsync(string userId)
    {
        await _userAnalyticsRepo.InvalidateCacheAsync($"user_analytics:{userId}*");
        await _orderSummaryRepo.InvalidateCacheAsync("order_summary:*"); // Orders affect summaries
    }

    private async Task<List<UserAnalytics>> ExecuteUserAnalyticsAggregation(string userId)
    {
        // Your existing aggregation pipeline code here
        var pipeline = new[]
        {
            new BsonDocument("$match", new BsonDocument("_id", ObjectId.Parse(userId))),
            // ... rest of pipeline
        };

        return await _users.Aggregate<UserAnalytics>(pipeline).ToListAsync();
    }

    private async Task<List<OrderSummary>> ExecuteOrderSummaryAggregation(DateTime startDate, DateTime endDate)
    {
        // Your existing aggregation pipeline code here
        var pipeline = new[]
        {
            new BsonDocument("$match", new BsonDocument
            {
                {"orderDate", new BsonDocument
                {
                    {"$gte", startDate},
                    {"$lte", endDate}
                }}
            }),
            // ... rest of pipeline
        };

        return await _orders.Aggregate<OrderSummary>(pipeline).ToListAsync();
    }
}

// 6. Dependency Injection Setup
public static class CacheServiceCollectionExtensions
{
    public static IServiceCollection AddCacheStrategy(
        this IServiceCollection services, 
        IConfiguration configuration)
    {
        // Configure cache options
        services.Configure<CacheOptions>(configuration.GetSection("Cache"));

        // Register cache services
        services.AddMemoryCache();
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
        });

        // Register our cache service as scoped (important!)
        services.AddScoped<ICacheService, MultiLevelCacheService>();
        
        // Register cached repositories
        services.AddScoped(typeof(ICachedRepository<>), typeof(CachedMongoRepository<>));
        
        // Register analytics service
        services.AddScoped<IAnalyticsService, CachedAnalyticsService>();

        return services;
    }
}

// 7. Cache Warming Strategy
public class CacheWarmupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CacheWarmupService> _logger;

    public CacheWarmupService(IServiceProvider serviceProvider, ILogger<CacheWarmupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await WarmupCommonQueries();
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during cache warmup");
            }
        }
    }

    private async Task WarmupCommonQueries()
    {
        using var scope = _serviceProvider.CreateScope();
        var analyticsService = scope.ServiceProvider.GetRequiredService<IAnalyticsService>();

        // Warm up common date ranges
        var today = DateTime.Today;
        await analyticsService.GetOrderSummaryAsync(today.AddDays(-7), today);
        await analyticsService.GetOrderSummaryAsync(today.AddDays(-30), today);

        _logger.LogInformation("Cache warmup completed");
    }
}
