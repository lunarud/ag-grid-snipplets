// Service Interface
public interface IAnalyticsService
{
    Task<List<UserAnalytics>> GetUserAnalyticsAsync(string userId);
    Task<List<OrderSummary>> GetOrderSummaryAsync(DateTime startDate, DateTime endDate);
}

// Scoped Service Implementation
public class AnalyticsService : IAnalyticsService
{
    private readonly IMongoCollection<User> _users;
    private readonly IMongoCollection<Order> _orders;
    private readonly IMongoCollection<Product> _products;
    private readonly ILogger<AnalyticsService> _logger;
    
    // Cache aggregation results within the scope
    private Dictionary<string, object> _aggregationCache = new();

    public AnalyticsService(
        IMongoDatabase database, 
        ILogger<AnalyticsService> logger)
    {
        _users = database.GetCollection<User>("users");
        _orders = database.GetCollection<Order>("orders");
        _products = database.GetCollection<Product>("products");
        _logger = logger;
    }

    public async Task<List<UserAnalytics>> GetUserAnalyticsAsync(string userId)
    {
        var cacheKey = $"user_analytics_{userId}";
        
        if (_aggregationCache.ContainsKey(cacheKey))
        {
            return (List<UserAnalytics>)_aggregationCache[cacheKey];
        }

        var pipeline = new[]
        {
            // Match specific user
            new BsonDocument("$match", new BsonDocument("_id", ObjectId.Parse(userId))),
            
            // Lookup orders
            new BsonDocument("$lookup", new BsonDocument
            {
                {"from", "orders"},
                {"localField", "_id"},
                {"foreignField", "userId"},
                {"as", "orders"}
            }),
            
            // Lookup products for each order
            new BsonDocument("$unwind", new BsonDocument
            {
                {"path", "$orders"},
                {"preserveNullAndEmptyArrays", true}
            }),
            
            new BsonDocument("$lookup", new BsonDocument
            {
                {"from", "products"},
                {"localField", "orders.productId"},
                {"foreignField", "_id"},
                {"as", "orderProducts"}
            }),
            
            // Group and calculate analytics
            new BsonDocument("$group", new BsonDocument
            {
                {"_id", "$_id"},
                {"userName", new BsonDocument("$first", "$name")},
                {"totalOrders", new BsonDocument("$sum", 1)},
                {"totalSpent", new BsonDocument("$sum", "$orders.totalAmount")},
                {"avgOrderValue", new BsonDocument("$avg", "$orders.totalAmount")},
                {"favoriteCategories", new BsonDocument("$push", "$orderProducts.category")},
                {"lastOrderDate", new BsonDocument("$max", "$orders.orderDate")}
            }),
            
            // Project final structure
            new BsonDocument("$project", new BsonDocument
            {
                {"userId", "$_id"},
                {"userName", 1},
                {"totalOrders", 1},
                {"totalSpent", 1},
                {"avgOrderValue", 1},
                {"lastOrderDate", 1},
                {"favoriteCategories", new BsonDocument("$setUnion", "$favoriteCategories")}
            })
        };

        var result = await _users.Aggregate<UserAnalytics>(pipeline).ToListAsync();
        
        // Cache within scope
        _aggregationCache[cacheKey] = result;
        
        _logger.LogInformation($"User analytics calculated for user {userId}");
        
        return result;
    }

    public async Task<List<OrderSummary>> GetOrderSummaryAsync(DateTime startDate, DateTime endDate)
    {
        var cacheKey = $"order_summary_{startDate:yyyyMMdd}_{endDate:yyyyMMdd}";
        
        if (_aggregationCache.ContainsKey(cacheKey))
        {
            return (List<OrderSummary>)_aggregationCache[cacheKey];
        }

        var pipeline = new[]
        {
            // Match date range
            new BsonDocument("$match", new BsonDocument
            {
                {"orderDate", new BsonDocument
                {
                    {"$gte", startDate},
                    {"$lte", endDate}
                }}
            }),
            
            // Lookup user info
            new BsonDocument("$lookup", new BsonDocument
            {
                {"from", "users"},
                {"localField", "userId"},
                {"foreignField", "_id"},
                {"as", "user"}
            }),
            
            // Unwind user array
            new BsonDocument("$unwind", "$user"),
            
            // Group by date and calculate metrics
            new BsonDocument("$group", new BsonDocument
            {
                {"_id", new BsonDocument("$dateToString", new BsonDocument
                {
                    {"format", "%Y-%m-%d"},
                    {"date", "$orderDate"}
                })},
                {"totalOrders", new BsonDocument("$sum", 1)},
                {"totalRevenue", new BsonDocument("$sum", "$totalAmount")},
                {"uniqueCustomers", new BsonDocument("$addToSet", "$userId")},
                {"avgOrderValue", new BsonDocument("$avg", "$totalAmount")}
            }),
            
            // Add calculated fields
            new BsonDocument("$addFields", new BsonDocument
            {
                {"uniqueCustomerCount", new BsonDocument("$size", "$uniqueCustomers")}
            }),
            
            // Sort by date
            new BsonDocument("$sort", new BsonDocument("_id", 1))
        };

        var result = await _orders.Aggregate<OrderSummary>(pipeline).ToListAsync();
        
        // Cache within scope
        _aggregationCache[cacheKey] = result;
        
        _logger.LogInformation($"Order summary calculated for {startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}");
        
        return result;
    }
}

// Data Models
public class UserAnalytics
{
    public string UserId { get; set; }
    public string UserName { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalSpent { get; set; }
    public decimal AvgOrderValue { get; set; }
    public DateTime LastOrderDate { get; set; }
    public List<string> FavoriteCategories { get; set; }
}

public class OrderSummary
{
    public string Date { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public int UniqueCustomerCount { get; set; }
    public decimal AvgOrderValue { get; set; }
}

// Startup Registration
public void ConfigureServices(IServiceCollection services)
{
    // Register MongoDB
    services.AddSingleton<IMongoClient>(sp =>
        new MongoClient("mongodb://localhost:27017"));
    
    services.AddScoped<IMongoDatabase>(sp =>
        sp.GetService<IMongoClient>().GetDatabase("ecommerce"));
    
    // Register scoped service
    services.AddScoped<IAnalyticsService, AnalyticsService>();
}

// Controller Usage
[ApiController]
[Route("api/[controller]")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<List<UserAnalytics>>> GetUserAnalytics(string userId)
    {
        var analytics = await _analyticsService.GetUserAnalyticsAsync(userId);
        return Ok(analytics);
    }

    [HttpGet("orders")]
    public async Task<ActionResult<List<OrderSummary>>> GetOrderSummary(
        DateTime startDate, DateTime endDate)
    {
        var summary = await _analyticsService.GetOrderSummaryAsync(startDate, endDate);
        return Ok(summary);
    }
}
