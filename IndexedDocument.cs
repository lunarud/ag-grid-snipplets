using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace MongoLucene
{
    // Document model for storing indexed content
    public class IndexedDocument
    {
        [BsonId]
        public ObjectId Id { get; set; }
        
        public string DocumentId { get; set; }
        public Dictionary<string, object> Fields { get; set; } = new Dictionary<string, object>();
        public Dictionary<string, List<string>> Tokens { get; set; } = new Dictionary<string, List<string>>();
        public DateTime IndexedAt { get; set; } = DateTime.UtcNow;
        public float Boost { get; set; } = 1.0f;
    }

    // Field definition for document structure
    public class Field
    {
        public string Name { get; set; }
        public object Value { get; set; }
        public FieldType Type { get; set; }
        public bool IsStored { get; set; }
        public bool IsIndexed { get; set; }
        public bool IsAnalyzed { get; set; }
        public float Boost { get; set; } = 1.0f;

        public Field(string name, object value, FieldType type = FieldType.Text, 
                    bool stored = true, bool indexed = true, bool analyzed = true)
        {
            Name = name;
            Value = value;
            Type = type;
            IsStored = stored;
            IsIndexed = indexed;
            IsAnalyzed = analyzed;
        }
    }

    public enum FieldType
    {
        Text,
        Keyword,
        Integer,
        Float,
        Date,
        Boolean
    }

    // Text analyzer interface and implementation
    public interface IAnalyzer
    {
        List<string> Analyze(string text);
    }

    public class StandardAnalyzer : IAnalyzer
    {
        private readonly HashSet<string> _stopWords = new HashSet<string>
        {
            "a", "an", "and", "are", "as", "at", "be", "but", "by", "for",
            "if", "in", "into", "is", "it", "no", "not", "of", "on", "or",
            "such", "that", "the", "their", "then", "there", "these", "they",
            "this", "to", "was", "will", "with"
        };

        public List<string> Analyze(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
                return new List<string>();

            // Convert to lowercase and extract words
            var words = Regex.Matches(text.ToLower(), @"\b\w+\b")
                            .Cast<Match>()
                            .Select(m => m.Value)
                            .Where(word => word.Length > 2 && !_stopWords.Contains(word))
                            .ToList();

            return words;
        }
    }

    // Query classes
    public abstract class Query
    {
        public float Boost { get; set; } = 1.0f;
        public abstract FilterDefinition<IndexedDocument> ToMongoFilter();
    }

    public class TermQuery : Query
    {
        public string Field { get; set; }
        public string Term { get; set; }

        public TermQuery(string field, string term)
        {
            Field = field;
            Term = term;
        }

        public override FilterDefinition<IndexedDocument> ToMongoFilter()
        {
            return Builders<IndexedDocument>.Filter.AnyEq($"Tokens.{Field}", Term);
        }
    }

    public class BooleanQuery : Query
    {
        public List<BooleanClause> Clauses { get; set; } = new List<BooleanClause>();

        public void Add(Query query, BooleanClause.Occur occur)
        {
            Clauses.Add(new BooleanClause(query, occur));
        }

        public override FilterDefinition<IndexedDocument> ToMongoFilter()
        {
            var mustFilters = new List<FilterDefinition<IndexedDocument>>();
            var shouldFilters = new List<FilterDefinition<IndexedDocument>>();
            var mustNotFilters = new List<FilterDefinition<IndexedDocument>>();

            foreach (var clause in Clauses)
            {
                var filter = clause.Query.ToMongoFilter();
                
                switch (clause.Occurrence)
                {
                    case BooleanClause.Occur.Must:
                        mustFilters.Add(filter);
                        break;
                    case BooleanClause.Occur.Should:
                        shouldFilters.Add(filter);
                        break;
                    case BooleanClause.Occur.MustNot:
                        mustNotFilters.Add(filter);
                        break;
                }
            }

            var combinedFilter = Builders<IndexedDocument>.Filter.Empty;
            
            if (mustFilters.Any())
                combinedFilter &= Builders<IndexedDocument>.Filter.And(mustFilters);
                
            if (shouldFilters.Any())
                combinedFilter &= Builders<IndexedDocument>.Filter.Or(shouldFilters);
                
            if (mustNotFilters.Any())
                combinedFilter &= Builders<IndexedDocument>.Filter.Not(
                    Builders<IndexedDocument>.Filter.Or(mustNotFilters));

            return combinedFilter;
        }
    }

    public class BooleanClause
    {
        public enum Occur { Must, Should, MustNot }
        
        public Query Query { get; set; }
        public Occur Occurrence { get; set; }

        public BooleanClause(Query query, Occur occur)
        {
            Query = query;
            Occurrence = occur;
        }
    }

    public class PhraseQuery : Query
    {
        public string Field { get; set; }
        public List<string> Terms { get; set; } = new List<string>();
        public int Slop { get; set; } = 0;

        public PhraseQuery(string field, params string[] terms)
        {
            Field = field;
            Terms.AddRange(terms);
        }

        public override FilterDefinition<IndexedDocument> ToMongoFilter()
        {
            // For phrase queries, we'll use MongoDB text search or regex
            var phrase = string.Join(" ", Terms);
            return Builders<IndexedDocument>.Filter.Regex($"Fields.{Field}", 
                new BsonRegularExpression(Regex.Escape(phrase), "i"));
        }
    }

    // Search results
    public class SearchResult
    {
        public IndexedDocument Document { get; set; }
        public float Score { get; set; }
        public Dictionary<string, object> Fields { get; set; }
    }

    public class SearchResults
    {
        public List<SearchResult> Results { get; set; } = new List<SearchResult>();
        public long TotalHits { get; set; }
        public TimeSpan QueryTime { get; set; }
    }

    // Main index writer class
    public class IndexWriter
    {
        private readonly IMongoCollection<IndexedDocument> _collection;
        private readonly IAnalyzer _analyzer;

        public IndexWriter(IMongoDatabase database, string indexName, IAnalyzer analyzer = null)
        {
            _collection = database.GetCollection<IndexedDocument>(indexName);
            _analyzer = analyzer ?? new StandardAnalyzer();
            
            // Create indexes for better performance
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            // Create text indexes on common fields
            var indexKeysDefinition = Builders<IndexedDocument>.IndexKeys
                .Text("Fields")
                .Text("Tokens");
                
            _collection.Indexes.CreateOne(new CreateIndexModel<IndexedDocument>(indexKeysDefinition));
            
            // Create index on DocumentId for faster lookups
            _collection.Indexes.CreateOne(new CreateIndexModel<IndexedDocument>(
                Builders<IndexedDocument>.IndexKeys.Ascending(x => x.DocumentId)));
        }

        public async Task AddDocumentAsync(string documentId, params Field[] fields)
        {
            var doc = new IndexedDocument
            {
                DocumentId = documentId
            };

            foreach (var field in fields)
            {
                // Store the original value if needed
                if (field.IsStored)
                {
                    doc.Fields[field.Name] = field.Value;
                }

                // Analyze and tokenize text fields for indexing
                if (field.IsIndexed && field.IsAnalyzed && field.Type == FieldType.Text)
                {
                    var tokens = _analyzer.Analyze(field.Value?.ToString() ?? "");
                    doc.Tokens[field.Name] = tokens;
                }
                else if (field.IsIndexed)
                {
                    // For non-analyzed fields, store as single token
                    doc.Tokens[field.Name] = new List<string> { field.Value?.ToString() ?? "" };
                }
            }

            await _collection.ReplaceOneAsync(
                Builders<IndexedDocument>.Filter.Eq(x => x.DocumentId, documentId),
                doc,
                new ReplaceOptions { IsUpsert = true });
        }

        public async Task DeleteDocumentAsync(string documentId)
        {
            await _collection.DeleteOneAsync(
                Builders<IndexedDocument>.Filter.Eq(x => x.DocumentId, documentId));
        }

        public async Task CommitAsync()
        {
            // In MongoDB, writes are immediately consistent, so this is a no-op
            // but we keep it for API compatibility
            await Task.CompletedTask;
        }
    }

    // Index searcher class
    public class IndexSearcher
    {
        private readonly IMongoCollection<IndexedDocument> _collection;

        public IndexSearcher(IMongoDatabase database, string indexName)
        {
            _collection = database.GetCollection<IndexedDocument>(indexName);
        }

        public async Task<SearchResults> SearchAsync(Query query, int maxResults = 10, int skip = 0)
        {
            var startTime = DateTime.UtcNow;
            
            var filter = query.ToMongoFilter();
            var totalCount = await _collection.CountDocumentsAsync(filter);
            
            var documents = await _collection
                .Find(filter)
                .Skip(skip)
                .Limit(maxResults)
                .ToListAsync();

            var results = documents.Select(doc => new SearchResult
            {
                Document = doc,
                Score = CalculateScore(doc, query),
                Fields = doc.Fields
            }).OrderByDescending(r => r.Score).ToList();

            return new SearchResults
            {
                Results = results,
                TotalHits = totalCount,
                QueryTime = DateTime.UtcNow - startTime
            };
        }

        private float CalculateScore(IndexedDocument doc, Query query)
        {
            // Simple scoring algorithm - can be enhanced
            // Based on document boost and query boost
            return doc.Boost * query.Boost;
        }
    }

    // Query parser for simple query strings
    public class QueryParser
    {
        private readonly string _defaultField;
        private readonly IAnalyzer _analyzer;

        public QueryParser(string defaultField, IAnalyzer analyzer)
        {
            _defaultField = defaultField;
            _analyzer = analyzer;
        }

        public Query Parse(string queryString)
        {
            if (string.IsNullOrWhiteSpace(queryString))
                return new TermQuery(_defaultField, "");

            // Simple parsing - can be enhanced for complex queries
            queryString = queryString.Trim();

            // Handle phrase queries (quoted strings)
            if (queryString.StartsWith("\"") && queryString.EndsWith("\""))
            {
                var phrase = queryString.Substring(1, queryString.Length - 2);
                var terms = _analyzer.Analyze(phrase);
                return new PhraseQuery(_defaultField, terms.ToArray());
            }

            // Handle boolean queries (AND, OR, NOT)
            if (queryString.Contains(" AND ") || queryString.Contains(" OR ") || queryString.Contains(" NOT "))
            {
                var boolQuery = new BooleanQuery();
                var parts = Regex.Split(queryString, @"\s+(AND|OR|NOT)\s+", RegexOptions.IgnoreCase);
                
                for (int i = 0; i < parts.Length; i += 2)
                {
                    if (i < parts.Length)
                    {
                        var termQuery = new TermQuery(_defaultField, parts[i].Trim());
                        var occur = BooleanClause.Occur.Should; // Default
                        
                        if (i > 0 && i - 1 < parts.Length)
                        {
                            var op = parts[i - 1].ToUpper();
                            occur = op switch
                            {
                                "AND" => BooleanClause.Occur.Must,
                                "OR" => BooleanClause.Occur.Should,
                                "NOT" => BooleanClause.Occur.MustNot,
                                _ => BooleanClause.Occur.Should
                            };
                        }
                        
                        boolQuery.Add(termQuery, occur);
                    }
                }
                
                return boolQuery;
            }

            // Simple term query
            return new TermQuery(_defaultField, queryString.ToLower());
        }
    }

    // Usage example and factory class
    public class MongoLuceneIndex
    {
        private readonly IMongoDatabase _database;
        private readonly string _indexName;

        public MongoLuceneIndex(string connectionString, string databaseName, string indexName)
        {
            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
            _indexName = indexName;
        }

        public IndexWriter GetWriter(IAnalyzer analyzer = null)
        {
            return new IndexWriter(_database, _indexName, analyzer);
        }

        public IndexSearcher GetSearcher()
        {
            return new IndexSearcher(_database, _indexName);
        }

        public QueryParser GetQueryParser(string defaultField, IAnalyzer analyzer = null)
        {
            return new QueryParser(defaultField, analyzer ?? new StandardAnalyzer());
        }
    }
}
