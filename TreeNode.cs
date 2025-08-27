using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System.ComponentModel.DataAnnotations;

namespace TreeDataApi.Models
{
    // MongoDB document model
    public class TreeNode
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }
        
        public string Name { get; set; }
        public string Description { get; set; }
        
        [BsonRepresentation(BsonType.ObjectId)]
        public string? ParentId { get; set; }
        
        public int Level { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsActive { get; set; }
        
        // Additional properties for your business logic
        public string NodeType { get; set; }
        public Dictionary<string, object> Metadata { get; set; } = new();
    }

    // Flattened model for ag-Grid
    public class FlatTreeNode
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string? ParentId { get; set; }
        public int Level { get; set; }
        public int SortOrder { get; set; }
        public DateTime CreatedDate { get; set; }
        public bool IsActive { get; set; }
        public string NodeType { get; set; }
        
        // ag-Grid specific properties
        public List<string> OrgHierarchy { get; set; } = new();
        public string FullPath { get; set; }
        public bool HasChildren { get; set; }
        public int ChildCount { get; set; }
        
        // Computed display properties
        public string DisplayName { get; set; }
        public string IndentedName { get; set; }
    }
}
