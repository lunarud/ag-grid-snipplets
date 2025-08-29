<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="MongoDB.Driver" Version="2.22.0" />
    <PackageReference Include="MongoDB.Bson" Version="2.22.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Configuration.Json" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
    <PackageReference Include="Microsoft.Extensions.Logging" Version="8.0.0" />
  </ItemGroup>

</Project>

<!-- appsettings.json configuration -->
<!-- 
{
  "MongoLucene": {
    "ConnectionString": "mongodb://localhost:27017",
    "DatabaseName": "SearchDatabase",
    "DefaultIndexName": "DocumentIndex",
    "Settings": {
      "MaxResultsPerQuery": 1000,
      "DefaultAnalyzer": "StandardAnalyzer",
      "EnableTextIndexes": true,
      "IndexRefreshInterval": "00:05:00"
    }
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "MongoLucene": "Debug"
    }
  }
}
-->

<!-- Additional Configuration and Dependency Injection Setup -->
<!--
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoLucene;

namespace MongoLucene.Configuration
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection AddMongoLucene(this IServiceCollection services, IConfiguration configuration)
        {
            var config = configuration.GetSection("MongoLucene").Get<MongoLuceneConfig>();
            services.AddSingleton(config);
            
            services.AddSingleton<IAnalyzer, StandardAnalyzer>();
            services.AddScoped<MongoLuceneIndex>(provider =>
            {
                return new MongoLuceneIndex(
                    config.ConnectionString,
                    config.DatabaseName,
                    config.DefaultIndexName
                );
            });
            
            services.AddScoped<IndexWriter>(provider =>
            {
                var index = provider.GetRequiredService<MongoLuceneIndex>();
                var analyzer = provider.GetRequiredService<IAnalyzer>();
                return index.GetWriter(analyzer);
            });
            
            services.AddScoped<IndexSearcher>(provider =>
            {
                var index = provider.GetRequiredService<MongoLuceneIndex>();
                return index.GetSearcher();
            });

            return services;
        }
    }

    public class MongoLuceneConfig
    {
        public string ConnectionString { get; set; } = "mongodb://localhost:27017";
        public string DatabaseName { get; set; } = "SearchDatabase";
        public string DefaultIndexName { get; set; } = "DocumentIndex";
        public MongoLuceneSettings Settings { get; set; } = new();
    }

    public class MongoLuceneSettings
    {
        public int MaxResultsPerQuery { get; set; } = 1000;
        public string DefaultAnalyzer { get; set; } = "StandardAnalyzer";
        public bool EnableTextIndexes { get; set; } = true;
        public TimeSpan IndexRefreshInterval { get; set; } = TimeSpan.FromMinutes(5);
    }
}

// Performance Monitoring and Metrics
namespace MongoLucene.Monitoring
{
    public class SearchMetrics
    {
        public int TotalSearches { get; set; }
        public double AverageQueryTimeMs { get; set; }
        public int TotalDocumentsIndexed { get; set; }
        public DateTime LastIndexUpdate { get; set; }
        public Dictionary<string, int> PopularSearchTerms { get; set; } = new();
    }

    public class MongoLuceneMetricsCollector
    {
        private readonly SearchMetrics _metrics = new();
        private readonly object _lock = new();

        public void RecordSearch(TimeSpan queryTime, string query)
        {
            lock (_lock)
            {
                _metrics.TotalSearches++;
                _metrics.AverageQueryTimeMs = 
                    (_metrics.AverageQueryTimeMs * (_metrics.TotalSearches - 1) + queryTime.TotalMilliseconds) 
                    / _metrics.TotalSearches;

                // Track popular terms
                var terms = query.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                foreach (var term in terms)
                {
                    _metrics.PopularSearchTerms[term.ToLower()] = 
                        _metrics.PopularSearchTerms.GetValueOrDefault(term.ToLower(), 0) + 1;
                }
            }
        }

        public void RecordIndexUpdate()
        {
            lock (_lock)
            {
                _metrics.TotalDocumentsIndexed++;
                _metrics.LastIndexUpdate = DateTime.UtcNow;
            }
        }

        public SearchMetrics GetMetrics()
        {
            lock (_lock)
            {
                return new SearchMetrics
                {
                    TotalSearches = _metrics.TotalSearches,
                    AverageQueryTimeMs = _metrics.AverageQueryTimeMs,
                    TotalDocumentsIndexed = _metrics.TotalDocumentsIndexed,
                    LastIndexUpdate = _metrics.LastIndexUpdate,
                    PopularSearchTerms = new Dictionary<string, int>(_metrics.PopularSearchTerms)
                };
            }
        }
    }
}

// Advanced Features: Faceted Search
namespace MongoLucene.Facets
{
    public class FacetRequest
    {
        public string Field { get; set; }
        public int MaxCount { get; set; } = 10;
    }

    public class FacetResult
    {
        public string Field { get; set; }
        public Dictionary<string, long> Values { get; set; } = new();
    }

    public class FacetedSearchResult : SearchResults
    {
        public Dictionary<string, FacetResult> Facets { get; set; } = new();
    }

    public static class FacetedSearchExtensions
    {
        public static async Task<FacetedSearchResult> SearchWithFacetsAsync(
            this IndexSearcher searcher,
            IMongoCollection<IndexedDocument> collection,
            Query query,
            int maxResults = 10,
            int skip = 0,
            params FacetRequest[] facetRequests)
        {
            var baseResults = await searcher.SearchAsync(query, maxResults, skip);
            var facetedResult = new FacetedSearchResult
            {
                Results = baseResults.Results,
                TotalHits = baseResults.TotalHits,
                QueryTime = baseResults.QueryTime
            };

            // Calculate facets
            foreach (var facetRequest in facetRequests)
            {
                var pipeline = new[]
                {
                    new BsonDocument("$match", query.ToMongoFilter().Render(
                        collection.DocumentSerializer, 
                        collection.Settings.SerializerRegistry)),
                    new BsonDocument("$group", new BsonDocument
                    {
                        { "_id", $"$Fields.{facetRequest.Field}" },
                        { "count", new BsonDocument("$sum", 1) }
                    }),
                    new BsonDocument("$sort", new BsonDocument("count", -1)),
                    new BsonDocument("$limit", facetRequest.MaxCount)
                };

                var facetResults = await collection.Aggregate<BsonDocument>(pipeline).ToListAsync();
                
                var facetValues = facetResults.ToDictionary(
                    doc => doc["_id"].ToString(),
                    doc => doc["count"].AsInt64
                );

                facetedResult.Facets[facetRequest.Field] = new FacetResult
                {
                    Field = facetRequest.Field,
                    Values = facetValues
                };
            }

            return facetedResult;
        }
    }
}
-->
