// Models/TreeNode.cs
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace TreeApp.Models
{
    public class TreeNode
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string Name { get; set; } = string.Empty;

        [BsonRepresentation(BsonType.ObjectId)]
        public string? ParentId { get; set; }

        public string Description { get; set; } = string.Empty;
        
        public int SortOrder { get; set; }
        
        public bool IsActive { get; set; } = true;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Additional properties for your business logic
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    // DTO for API responses with hierarchical structure
    public class TreeNodeDto
    {
        public string Id { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string? ParentId { get; set; }
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
        
        // Tree-specific properties
        public List<TreeNodeDto> Children { get; set; } = new();
        public int Level { get; set; }
        public string Path { get; set; } = string.Empty; // e.g., "root/parent/child"
        public bool HasChildren { get; set; }
        public bool IsExpanded { get; set; } = false;
    }

    // Request models
    public class CreateTreeNodeRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? ParentId { get; set; }
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    public class UpdateTreeNodeRequest
    {
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? ParentId { get; set; }
        public string Description { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsActive { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    public class MoveNodeRequest
    {
        [Required]
        public string NodeId { get; set; } = string.Empty;
        public string? NewParentId { get; set; }
        public int NewSortOrder { get; set; }
    }
}

// Services/ITreeRepository.cs
using TreeApp.Models;

namespace TreeApp.Services
{
    public interface ITreeRepository
    {
        Task<IEnumerable<TreeNode>> GetAllNodesAsync();
        Task<TreeNode?> GetNodeByIdAsync(string id);
        Task<IEnumerable<TreeNode>> GetNodesByParentIdAsync(string? parentId);
        Task<IEnumerable<TreeNode>> GetNodePathAsync(string nodeId);
        Task<TreeNode> CreateNodeAsync(TreeNode node);
        Task<TreeNode> UpdateNodeAsync(TreeNode node);
        Task DeleteNodeAsync(string id);
        Task<bool> MoveNodeAsync(string nodeId, string? newParentId, int newSortOrder);
        Task<IEnumerable<TreeNode>> SearchNodesAsync(string searchTerm);
    }
}

// Services/TreeRepository.cs
using MongoDB.Driver;
using TreeApp.Models;
using TreeApp.Services;

namespace TreeApp.Services
{
    public class TreeRepository : ITreeRepository
    {
        private readonly IMongoCollection<TreeNode> _collection;

        public TreeRepository(IMongoDatabase database)
        {
            _collection = database.GetCollection<TreeNode>("treenodes");
            
            // Create indexes for better performance
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            var indexKeysDefinition = Builders<TreeNode>.IndexKeys
                .Ascending(x => x.ParentId)
                .Ascending(x => x.SortOrder);
            _collection.Indexes.CreateOne(new CreateIndexModel<TreeNode>(indexKeysDefinition));

            var nameIndexKeysDefinition = Builders<TreeNode>.IndexKeys.Text(x => x.Name);
            _collection.Indexes.CreateOne(new CreateIndexModel<TreeNode>(nameIndexKeysDefinition));
        }

        public async Task<IEnumerable<TreeNode>> GetAllNodesAsync()
        {
            return await _collection
                .Find(_ => true)
                .SortBy(x => x.ParentId)
                .ThenBy(x => x.SortOrder)
                .ToListAsync();
        }

        public async Task<TreeNode?> GetNodeByIdAsync(string id)
        {
            return await _collection.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<TreeNode>> GetNodesByParentIdAsync(string? parentId)
        {
            var filter = parentId == null 
                ? Builders<TreeNode>.Filter.Eq(x => x.ParentId, BsonNull.Value)
                : Builders<TreeNode>.Filter.Eq(x => x.ParentId, parentId);

            return await _collection
                .Find(filter)
                .SortBy(x => x.SortOrder)
                .ToListAsync();
        }

        public async Task<IEnumerable<TreeNode>> GetNodePathAsync(string nodeId)
        {
            var path = new List<TreeNode>();
            var currentNode = await GetNodeByIdAsync(nodeId);

            while (currentNode != null)
            {
                path.Insert(0, currentNode);
                
                if (string.IsNullOrEmpty(currentNode.ParentId))
                    break;
                    
                currentNode = await GetNodeByIdAsync(currentNode.ParentId);
            }

            return path;
        }

        public async Task<TreeNode> CreateNodeAsync(TreeNode node)
        {
            node.CreatedAt = DateTime.UtcNow;
            node.UpdatedAt = DateTime.UtcNow;
            
            await _collection.InsertOneAsync(node);
            return node;
        }

        public async Task<TreeNode> UpdateNodeAsync(TreeNode node)
        {
            node.UpdatedAt = DateTime.UtcNow;
            
            await _collection.ReplaceOneAsync(x => x.Id == node.Id, node);
            return node;
        }

        public async Task DeleteNodeAsync(string id)
        {
            // First, recursively delete all children
            var children = await GetNodesByParentIdAsync(id);
            foreach (var child in children)
            {
                await DeleteNodeAsync(child.Id);
            }

            // Then delete the node itself
            await _collection.DeleteOneAsync(x => x.Id == id);
        }

        public async Task<bool> MoveNodeAsync(string nodeId, string? newParentId, int newSortOrder)
        {
            var node = await GetNodeByIdAsync(nodeId);
            if (node == null) return false;

            // Prevent circular references
            if (await WouldCreateCircularReference(nodeId, newParentId))
                return false;

            node.ParentId = newParentId;
            node.SortOrder = newSortOrder;
            node.UpdatedAt = DateTime.UtcNow;

            await _collection.ReplaceOneAsync(x => x.Id == nodeId, node);
            return true;
        }

        public async Task<IEnumerable<TreeNode>> SearchNodesAsync(string searchTerm)
        {
            var filter = Builders<TreeNode>.Filter.Text(searchTerm);
            return await _collection.Find(filter).ToListAsync();
        }

        private async Task<bool> WouldCreateCircularReference(string nodeId, string? newParentId)
        {
            if (string.IsNullOrEmpty(newParentId)) return false;

            var currentParent = newParentId;
            while (!string.IsNullOrEmpty(currentParent))
            {
                if (currentParent == nodeId) return true;
                
                var parentNode = await GetNodeByIdAsync(currentParent);
                currentParent = parentNode?.ParentId;
            }

            return false;
        }
    }
}
