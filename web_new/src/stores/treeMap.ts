import * as d3 from 'd3';
import type { CardGroup } from '../types/card';
import type { TreeMapRect, TreeMapNode } from '../types/treemap';
import type { TreeMapLayout } from '../types/treemap';

interface HierarchyRectangularNode extends d3.HierarchyRectangularNode<TreeMapNode> {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function calculateTreeMap(
  group: CardGroup,
  width: number,
  height: number
): TreeMapLayout | null {
  if (!group || width <= 0 || height <= 0) {
    return null;
  }

  try {
    // Create hierarchy from group data
    const treenode = convertGroupToHierarchyWithCards(group);
    if (!treenode) {
      return null;
    }
    const hierarchy = d3.hierarchy(treenode).sum(d => d.cardCount);

    // Create treemap layout
    const treemap = d3
      .treemap<TreeMapNode>()
      .tile(d3.treemapSquarify.ratio(1))
      .size([width, height])
      .round(true);

    // Generate layout
    const root = treemap(hierarchy);

    // Convert to our TreeMapRect format
    const nodes: TreeMapRect[] = [];
    const groupNodes: TreeMapRect[] = [];

    function processNode(node: HierarchyRectangularNode, parentPath: string[] = []): void {
      const currentPath = [...parentPath, node.name];
      if (node.children) {
        // Group node
        groupNodes.push({ x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1, data: node.data });
        node.children.forEach(child => processNode(child, currentPath));
      } else {
        // Leaf node (card)
        nodes.push({ x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1, data: node.data });
      }
    }

    processNode(root);

    return { nodes, groupNodes, width, height };
  } catch (error) {
    console.error('Error calculating TreeMap layout:', error);
    return null;
  }
}

/**
 * Convert CardGroup hierarchy to D3 hierarchy structure
 * Each card becomes a leaf node, maintaining group structure
 */
function convertGroupToHierarchyWithCards(group: CardGroup): TreeMapNode | null {
  const children: TreeMapNode[] = [];

  // Add subgroups as children (only if they have content)
  for (const subgroup of group.subgroups.values()) {
    const childNode = convertGroupToHierarchyWithCards(subgroup);
    if (childNode) {
      children.push(childNode);
    }
  }

  // Add individual cards as leaf nodes
  group.cards.forEach((card, index) => {
    children.push({
      name: `Card ${index + 1}`,
      path: [...group.path, `card-${index}`],
      value: 1, // Each card has equal weight
      cardCount: 1,
      averageRetention: card.retentionRate,
      cardData: card, // Store card data for reference
    });
  });

  // Only return a node if it has children (cards or subgroups with content)
  if (children.length === 0) {
    return null;
  }

  const node: TreeMapNode = {
    name: group.name,
    path: group.path,
    value: 0, // Will be calculated from children in D3.js
    // Don't sum values -- D3 already do this.
    cardCount: 0, // group.cards.length,
    averageRetention: group.averageRetention,
  };

  node.children = children;
  // Don't sum values -- D3 already do this.
  // node.value = children.reduce((sum, child) => sum + child.value, 0);

  return node;
}
