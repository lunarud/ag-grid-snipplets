// Advanced Tree Query Patterns
// Services/ITreeQueryService.cs
using TreeApp.Models;

namespace TreeApp.Services
{
    public interface ITreeQueryService
    {
        Task<IEnumerable<TreeNode>> GetSubtreeAsync(string rootId, int? maxDepth = null);
        Task<IEnumerable<TreeNode>> GetLeafNodesAsync();
        Task<IEnumerable<TreeNode>> GetNodesAtLevelAsync(int level);
        Task<IEnumerable<TreeNode>> GetSiblingsAsync(string nodeId);
        Task<IEnumerable<TreeNode>> GetAncestorsAsync(string nodeId);
        Task<IEnumerable<TreeNode>> GetDescendantsAsync(string nodeId);
        Task<TreeStatistics> GetTreeStatisticsAsync();
        Task<IEnumerable<TreeNode>> FindOrphanedNodesAsync();
        Task<IEnumerable<TreeNode>> GetNodesByMetadataAsync(string key, object value);
        Task<TreeNode?> FindLowestCommonAncestorAsync(string nodeId1, string nodeId2);
    }

    public class TreeStatistics
    {
        public int TotalNodes { get; set; }
        public int RootNodes { get; set; }
        public int LeafNodes { get; set; }
        public int MaxDepth { get; set; }
        public double AverageChildrenPerNode { get; set; }
        public Dictionary<int, int> NodesPerLevel { get; set; } = new();
    }
}

// Services/TreeQueryService.cs
using MongoDB.Driver;
using TreeApp.Models;

namespace TreeApp.Services
{
    public class TreeQueryService : ITreeQueryService
    {
        private readonly IMongoCollection<TreeNode> _collection;

        public TreeQueryService(IMongoDatabase database)
        {
            _collection = database.GetCollection<TreeNode>("treenodes");
        }

        public async Task<IEnumerable<TreeNode>> GetSubtreeAsync(string rootId, int? maxDepth = null)
        {
            // Get all descendants using MongoDB aggregation pipeline
            var pipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("$or", new BsonArray
                {
                    new BsonDocument("_id", new ObjectId(rootId)),
                    new BsonDocument("$expr", new BsonDocument("$function", new BsonDocument
                    {
                        {"body", @"
                            function(parentId, rootId) {
                                function isDescendant(currentId, targetRootId, visited = new Set()) {
                                    if (!currentId || visited.has(currentId.toString())) return false;
                                    if (currentId.toString() === targetRootId.toString()) return true;
                                    
                                    visited.add(currentId.toString());
                                    const parent = db.treenodes.findOne({_id: currentId});
                                    return parent && parent.parentId && isDescendant(parent.parentId, targetRootId, visited);
                                }
                                return isDescendant(parentId, rootId);
                            }
                        "},
                        {"args", new BsonArray { "$parentId", new ObjectId(rootId) }},
                        {"lang", "js"}
                    }))
                })),
                new BsonDocument("$sort", new BsonDocument { {"parentId", 1}, {"sortOrder", 1} })
            };

            // Simpler approach using recursive lookup (MongoDB 3.6+)
            var recursivePipeline = new[]
            {
                new BsonDocument("$match", new BsonDocument("_id", new ObjectId(rootId))),
                new BsonDocument("$graphLookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"startWith", "$_id"},
                    {"connectFromField", "_id"},
                    {"connectToField", "parentId"},
                    {"as", "descendants"},
                    {"maxDepth", maxDepth ?? 100}
                }),
                new BsonDocument("$project", new BsonDocument
                {
                    {"allNodes", new BsonDocument("$concatArrays", new BsonArray { new BsonArray { "$$ROOT" }, "$descendants" })}
                }),
                new BsonDocument("$unwind", "$allNodes"),
                new BsonDocument("$replaceRoot", new BsonDocument("newRoot", "$allNodes")),
                new BsonDocument("$sort", new BsonDocument { {"parentId", 1}, {"sortOrder", 1} })
            };

            var result = await _collection.Aggregate<TreeNode>(recursivePipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetLeafNodesAsync()
        {
            // Nodes that don't have any children
            var pipeline = new[]
            {
                new BsonDocument("$lookup", new BsonDocument
                {
                    {"from", "treenodes"},
                    {"localField", "_id"},
                    {"foreignField", "parentId"},
                    {"as", "children"}
                }),
                new BsonDocument("$match", new BsonDocument("children", new BsonDocument("$size", 0))),
                new BsonDocument("$project", new BsonDocument("children", 0))
            };

            var result = await _collection.Aggregate<TreeNode>(pipeline).ToListAsync();
            return result;
        }

        public async Task<IEnumerable<TreeNode>> GetNodesAtLevelAsync(int level)
        {
            // Calculate level using recursive aggregation
            var pipeline = new[]
            {
                new BsonDocument("$graphLookup", new BsonDocument
                {
                    {"from
