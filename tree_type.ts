// Define the interface for flat node data
interface FlatNode {
  id: string | number;
  parentId: string | number | null;
  name: string;
  // Add any other properties your nodes might have
  [key: string]: any;
}

// Define the interface for tree node
interface TreeNode extends Omit<FlatNode, 'parentId'> {
  children: TreeNode[];
}

/**
 * Converts a flat list of nodes with parent-child relationships into a tree structure
 * @param flatList - Array of flat nodes with parentId references
 * @returns Array of root tree nodes
 */
function buildTree(flatList: FlatNode[]): TreeNode[] {
  // Create a map for O(1) lookups
  const nodeMap = new Map<string | number, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // First pass: Create all tree nodes and store in map
  flatList.forEach(flatNode => {
    const { parentId, ...nodeData } = flatNode;
    const treeNode: TreeNode = {
      ...nodeData,
      children: []
    };
    nodeMap.set(flatNode.id, treeNode);
  });

  // Second pass: Build the tree structure
  flatList.forEach(flatNode => {
    const currentNode = nodeMap.get(flatNode.id)!;
    
    if (flatNode.parentId === null || flatNode.parentId === undefined) {
      // This is a root node
      rootNodes.push(currentNode);
    } else {
      // Find parent and add this node as a child
      const parentNode = nodeMap.get(flatNode.parentId);
      if (parentNode) {
        parentNode.children.push(currentNode);
      } else {
        // Parent not found, treat as root (orphaned node)
        rootNodes.push(currentNode);
      }
    }
  });

  return rootNodes;
}

/**
 * Alternative implementation using reduce for a more functional approach
 */
function buildTreeFunctional(flatList: FlatNode[]): TreeNode[] {
  const nodeMap = flatList.reduce((map, node) => {
    const { parentId, ...nodeData } = node;
    map.set(node.id, { ...nodeData, children: [] });
    return map;
  }, new Map<string | number, TreeNode>());

  return flatList.reduce((roots, flatNode) => {
    const node = nodeMap.get(flatNode.id)!;
    
    if (flatNode.parentId === null || flatNode.parentId === undefined) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(flatNode.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // Orphaned node becomes root
      }
    }
    
    return roots;
  }, [] as TreeNode[]);
}

/**
 * Utility function to print the tree structure for debugging
 */
function printTree(nodes: TreeNode[], depth = 0): void {
  nodes.forEach(node => {
    console.log('  '.repeat(depth) + `- ${node.name} (${node.id})`);
    if (node.children.length > 0) {
      printTree(node.children, depth + 1);
    }
  });
}

/**
 * Utility function to find a node by id in the tree
 */
function findNodeById(nodes: TreeNode[], id: string | number): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }
    const found = findNodeById(node.children, id);
    if (found) {
      return found;
    }
  }
  return null;
}

// Example usage:
const flatData: FlatNode[] = [
  { id: 1, parentId: null, name: 'Root 1' },
  { id: 2, parentId: null, name: 'Root 2' },
  { id: 3, parentId: 1, name: 'Child 1.1' },
  { id: 4, parentId: 1, name: 'Child 1.2' },
  { id: 5, parentId: 3, name: 'Child 1.1.1' },
  { id: 6, parentId: 3, name: 'Child 1.1.2' },
  { id: 7, parentId: 2, name: 'Child 2.1' },
  { id: 8, parentId: 7, name: 'Child 2.1.1' }
];

// Build the tree
const tree = buildTree(flatData);

// Print the tree structure
console.log('Tree structure:');
printTree(tree);

// Example of finding a specific node
const foundNode = findNodeById(tree, 5);
console.log('Found node:', foundNode);

export { buildTree, buildTreeFunctional, printTree, findNodeById, type FlatNode, type TreeNode };
