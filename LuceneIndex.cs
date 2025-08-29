using System;
using System.Threading.Tasks;
using MongoLucene;

class Program
{
    static async Task Main(string[] args)
    {
        // Initialize the MongoDB Lucene index
        var connectionString = "mongodb://localhost:27017";
        var databaseName = "SearchDatabase";
        var indexName = "DocumentIndex";
        
        var mongoIndex = new MongoLuceneIndex(connectionString, databaseName, indexName);

        // Example 1: Indexing documents
        await IndexDocuments(mongoIndex);

        // Example 2: Simple searching
        await SimpleSearch(mongoIndex);

        // Example 3: Advanced querying
        await AdvancedSearch(mongoIndex);

        // Example 4: Boolean queries
        await BooleanSearch(mongoIndex);

        // Example 5: Phrase queries
        await PhraseSearch(mongoIndex);

        Console.WriteLine("\nAll examples completed successfully!");
    }

    static async Task IndexDocuments(MongoLuceneIndex mongoIndex)
    {
        Console.WriteLine("=== Indexing Documents ===");
        
        var writer = mongoIndex.GetWriter(new StandardAnalyzer());

        // Index some sample documents
        await writer.AddDocumentAsync("doc1",
            new Field("title", "Introduction to MongoDB", FieldType.Text, stored: true, indexed: true),
            new Field("content", "MongoDB is a document-oriented NoSQL database system. It stores data in flexible, JSON-like documents.", FieldType.Text, stored: true, indexed: true),
            new Field("author", "John Doe", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("category", "Database", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("published_date", DateTime.Parse("2023-01-15"), FieldType.Date, stored: true, indexed: true)
        );

        await writer.AddDocumentAsync("doc2",
            new Field("title", "Lucene.NET Search Engine", FieldType.Text, stored: true, indexed: true),
            new Field("content", "Lucene.NET is a port of the popular Apache Lucene search library to .NET. It provides full-text search capabilities.", FieldType.Text, stored: true, indexed: true),
            new Field("author", "Jane Smith", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("category", "Search", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("published_date", DateTime.Parse("2023-02-20"), FieldType.Date, stored: true, indexed: true)
        );

        await writer.AddDocumentAsync("doc3",
            new Field("title", "C# Programming Best Practices", FieldType.Text, stored: true, indexed: true),
            new Field("content", "This article covers best practices for C# development including SOLID principles, design patterns, and performance optimization.", FieldType.Text, stored: true, indexed: true),
            new Field("author", "Mike Johnson", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("category", "Programming", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("published_date", DateTime.Parse("2023-03-10"), FieldType.Date, stored: true, indexed: true)
        );

        await writer.AddDocumentAsync("doc4",
            new Field("title", "Database Design Patterns", FieldType.Text, stored: true, indexed: true),
            new Field("content", "Exploring various database design patterns for both SQL and NoSQL databases. Learn about normalization, denormalization, and schema design.", FieldType.Text, stored: true, indexed: true),
            new Field("author", "Sarah Wilson", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("category", "Database", FieldType.Keyword, stored: true, indexed: true, analyzed: false),
            new Field("published_date", DateTime.Parse("2023-04-05"), FieldType.Date, stored: true, indexed: true)
        );

        await writer.CommitAsync();
        Console.WriteLine("Indexed 4 documents successfully.");
    }

    static async Task SimpleSearch(MongoLuceneIndex mongoIndex)
    {
        Console.WriteLine("\n=== Simple Search ===");
        
        var searcher = mongoIndex.GetSearcher();
        var parser = mongoIndex.GetQueryParser("content");

        // Simple term search
        var query = parser.Parse("MongoDB");
        var results = await searcher.SearchAsync(query, maxResults: 10);

        Console.WriteLine($"Found {results.TotalHits} documents for 'MongoDB' (took {results.QueryTime.TotalMilliseconds}ms):");
        
        foreach (var result in results.Results)
        {
            Console.WriteLine($"- {result.Fields["title"]} (Score: {result.Score:F2})");
            Console.WriteLine($"  Author: {result.Fields["author"]}");
            Console.WriteLine($"  Category: {result.Fields["category"]}");
            Console.WriteLine();
        }
    }

    static async Task AdvancedSearch(MongoLuceneIndex mongoIndex)
    {
        Console.WriteLine("=== Advanced Search ===");
        
        var searcher = mongoIndex.GetSearcher();

        // Create a more complex query using TermQuery directly
        var query = new TermQuery("category", "Database");
        var results = await searcher.SearchAsync(query, maxResults: 10);

        Console.WriteLine($"Found {results.TotalHits} documents in 'Database' category:");
        
        foreach (var result in results.Results)
        {
            Console.WriteLine($"- {result.Fields["title"]}");
            Console.WriteLine($"  Content: {result.Fields["content"].ToString().Substring(0, Math.Min(100, result.Fields["content"].ToString().Length))}...");
            Console.WriteLine();
        }
    }

    static async Task BooleanSearch(MongoLuceneIndex mongoIndex)
    {
        Console.WriteLine("=== Boolean Search ===");
        
        var searcher = mongoIndex.GetSearcher();

        // Create a boolean query: documents that contain "database" AND are in "Database" category
        var boolQuery = new BooleanQuery();
        boolQuery.Add(new TermQuery("content", "database"), BooleanClause.Occur.Must);
        boolQuery.Add(new TermQuery("category", "Database"), BooleanClause.Occur.Must);

        var results = await searcher.SearchAsync(boolQuery, maxResults: 10);

        Console.WriteLine($"Found {results.TotalHits} documents with 'database' content in 'Database' category:");
        
        foreach (var result in results.Results)
        {
            Console.WriteLine($"- {result.Fields["title"]}");
            Console.WriteLine($"  Author: {result.Fields["author"]}");
            Console.WriteLine();
        }

        // Boolean query with OR condition
        Console.WriteLine("\nOR Query - documents about 'MongoDB' OR 'Lucene':");
        
        var orQuery = new BooleanQuery();
        orQuery.Add(new TermQuery("content", "mongodb"), BooleanClause.Occur.Should);
        orQuery.Add(new TermQuery("content", "lucene"), BooleanClause.Occur.Should);

        var orResults = await searcher.SearchAsync(orQuery, maxResults: 10);

        Console.WriteLine($"Found {orResults.TotalHits} documents:");
        foreach (var result in orResults.Results)
        {
            Console.WriteLine($"- {result.Fields["title"]}");
        }
        Console.WriteLine();
    }

    static async Task PhraseSearch(MongoLuceneIndex mongoIndex)
    {
        Console.WriteLine("=== Phrase Search ===");
        
        var searcher = mongoIndex.GetSearcher();

        // Search for exact phrase
        var phraseQuery = new PhraseQuery("content", "design", "patterns");
        var results = await searcher.SearchAsync(phraseQuery, maxResults: 10);

        Console.WriteLine($"Found {results.TotalHits} documents containing phrase 'design patterns':");
        
        foreach (var result in results.Results)
        {
            Console.WriteLine($"- {result.Fields["title"]}");
            Console.WriteLine($"  Category: {result.Fields["category"]}");
            Console.WriteLine();
        }
    }
}

// Additional helper classes for more advanced functionality

namespace MongoLucene.Extensions
{
    public static class QueryExtensions
    {
        public static Query CreateWildcardQuery(string field, string pattern)
        {
            // Convert wildcard pattern to regex
            var regexPattern = pattern.Replace("*", ".*").Replace("?", ".");
            return new RegexQuery(field, regexPattern);
        }

        public static Query CreateRangeQuery(string field, object lowerValue, object upperValue, bool includeLower = true, bool includeUpper = true)
        {
            return new RangeQuery(field, lowerValue, upperValue, includeLower, includeUpper);
        }
    }

    // Additional query types
    public class RegexQuery : Query
    {
        public string Field { get; set; }
        public string Pattern { get; set; }

        public RegexQuery(string field, string pattern)
        {
            Field = field;
            Pattern = pattern;
        }

        public override FilterDefinition<IndexedDocument> ToMongoFilter()
        {
            return Builders<IndexedDocument>.Filter.Regex($"Fields.{Field}", 
                new MongoDB.Bson.BsonRegularExpression(Pattern, "i"));
        }
    }

    public class RangeQuery : Query
    {
        public string Field { get; set; }
        public object LowerValue { get; set; }
        public object UpperValue { get; set; }
        public bool IncludeLower { get; set; }
        public bool IncludeUpper { get; set; }

        public RangeQuery(string field, object lowerValue, object upperValue, bool includeLower = true, bool includeUpper = true)
        {
            Field = field;
            LowerValue = lowerValue;
            UpperValue = upperValue;
            IncludeLower = includeLower;
            IncludeUpper = includeUpper;
        }

        public override FilterDefinition<IndexedDocument> ToMongoFilter()
        {
            var builder = Builders<IndexedDocument>.Filter;
            var fieldPath = $"Fields.{Field}";

            var filters = new List<FilterDefinition<IndexedDocument>>();

            if (LowerValue != null)
            {
                if (IncludeLower)
                    filters.Add(builder.Gte(fieldPath, LowerValue));
                else
                    filters.Add(builder.Gt(fieldPath, LowerValue));
            }

            if (UpperValue != null)
            {
                if (IncludeUpper)
                    filters.Add(builder.Lte(fieldPath, UpperValue));
                else
                    filters.Add(builder.Lt(fieldPath, UpperValue));
            }

            return filters.Count > 1 ? builder.And(filters) : filters.FirstOrDefault() ?? builder.Empty;
        }
    }

    // Sorting support
    public class SortField
    {
        public string Field { get; set; }
        public SortOrder Order { get; set; }

        public SortField(string field, SortOrder order = SortOrder.Ascending)
        {
            Field = field;
            Order = order;
        }
    }

    public enum SortOrder
    {
        Ascending,
        Descending
    }

    // Enhanced searcher with sorting
    public class EnhancedIndexSearcher : IndexSearcher
    {
        private readonly IMongoCollection<IndexedDocument> _collection;

        public EnhancedIndexSearcher(IMongoDatabase database, string indexName) : base(database, indexName)
        {
            _collection = database.GetCollection<IndexedDocument>(indexName);
        }

        public async Task<SearchResults> SearchAsync(Query query, int maxResults = 10, int skip = 0, params SortField[] sortFields)
        {
            var startTime = DateTime.UtcNow;
            
            var filter = query.ToMongoFilter();
            var totalCount = await _collection.CountDocumentsAsync(filter);
            
            var findFluent = _collection.Find(filter);

            // Apply sorting
            if (sortFields?.Length > 0)
            {
                var sortDefinition = CreateSortDefinition(sortFields);
                findFluent = findFluent.Sort(sortDefinition);
            }

            var documents = await findFluent
                .Skip(skip)
                .Limit(maxResults)
                .ToListAsync();

            var results = documents.Select(doc => new SearchResult
            {
                Document = doc,
                Score = CalculateScore(doc, query),
                Fields = doc.Fields
            }).ToList();

            // If no explicit sorting, sort by score
            if (sortFields?.Length == 0)
            {
                results = results.OrderByDescending(r => r.Score).ToList();
            }

            return new SearchResults
            {
                Results = results,
                TotalHits = totalCount,
                QueryTime = DateTime.UtcNow - startTime
            };
        }

        private SortDefinition<IndexedDocument> CreateSortDefinition(SortField[] sortFields)
        {
            var sortBuilder = Builders<IndexedDocument>.Sort;
            SortDefinition<IndexedDocument> sortDefinition = null;

            foreach (var sortField in sortFields)
            {
                var fieldSort = sortField.Order == SortOrder.Ascending
                    ? sortBuilder.Ascending($"Fields.{sortField.Field}")
                    : sortBuilder.Descending($"Fields.{sortField.Field}");

                sortDefinition = sortDefinition == null ? fieldSort : sortDefinition.ThenBy(fieldSort);
            }

            return sortDefinition;
        }
    }
}
