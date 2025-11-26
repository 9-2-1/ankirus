import { useMemo } from 'react';
import * as d3 from 'd3';
import { CardGroup } from '../types/card';
import { TreeMapNode, TreeMapLayout, TreeMapRect } from '../types/treemap';
import { measurePerformance } from '../utils/performance';
import { PERFORMANCE_CONFIG } from '../utils/performanceConfig';
import { findGroupByPath } from '../utils/groupListBuilder';

/**
 * Hook to calculate TreeMap layout using D3.js
 * Each card becomes a block, grouped by hierarchy
 */
export function useTreeMap(
  group: CardGroup,
  width: number,
  height: number,
  selectedGroupPath: string[] | null = null
): TreeMapLayout | null {
  // Create a stable key for memoization based on group structure and selected group
  const groupKey = useMemo(() => {
    return JSON.stringify({
      totalCards: group.totalCards,
      path: group.path,
      name: group.name,
      selectedGroupPath,
    });
  }, [group.totalCards, group.path, group.name, selectedGroupPath]);

  return useMemo(() => {
    if (width === 0 || height === 0) return null;

    return measurePerformance(() => {
      // Filter group if a specific group is selected
      const displayGroup = selectedGroupPath
        ? findGroupByPath(group, selectedGroupPath) || group
        : group;

      // Convert group hierarchy to D3 hierarchy with individual cards
      const rootNode = convertGroupToHierarchyWithCards(displayGroup);

      if (!rootNode) return null;

      // Create TreeMap layout with optimized squarified algorithm for more square-like blocks
      const treemap = d3
        .treemap<TreeMapNode>()
        .tile(d3.treemapSquarify.ratio(1)) // Target 1:1 aspect ratio
        .size([width, height])
        .padding(0) // No padding (already have group borders)
        .round(true);

      // Calculate layout - each leaf node represents one card
      const hierarchy = d3
        .hierarchy(rootNode)
        .sum(d => d.value)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

      const layoutRoot = treemap(hierarchy);

      // Extract all leaf nodes (individual cards)
      const nodes: TreeMapRect[] = [];
      layoutRoot.leaves().forEach(node => {
        // Skip very small nodes to improve performance
        const area = (node.x1 - node.x0) * (node.y1 - node.y0);
        if (area > PERFORMANCE_CONFIG.MIN_NODE_AREA) {
          nodes.push({ x0: node.x0, y0: node.y0, x1: node.x1, y1: node.y1, data: node.data });
        }
      });

      // Extract group nodes for borders (non-leaf nodes)
      const groupNodes: TreeMapRect[] = [];
      layoutRoot.descendants().forEach(node => {
        // Only include non-leaf nodes that have children
        if (node.children && node.children.length > 0) {
          // Only include groups that are large enough
          const area = (node.x1 - node.x0) * (node.y1 - node.y0);
          if (area > PERFORMANCE_CONFIG.MIN_NODE_AREA * 10) {
            // Groups need larger area
            groupNodes.push({
              x0: node.x0,
              y0: node.y0,
              x1: node.x1,
              y1: node.y1,
              data: node.data,
            });
          }
        }
      });

      // Apply additional optimizations for high card counts
      if (group.totalCards > PERFORMANCE_CONFIG.HIGH_CARD_COUNT_THRESHOLD) {
        console.log(
          `⏱️ High card count detected (${group.totalCards}), applying additional optimizations`
        );
      }

      return { nodes, groupNodes, width, height };
    }, 'TreeMap Layout Calculation');
  }, [groupKey, width, height]);
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
    cardCount: group.cards.length,
    averageRetention: group.averageRetention,
  };

  node.children = children;
  // Don't sum values -- D3 already do this.
  // node.value = children.reduce((sum, child) => sum + child.value, 0);

  return node;
}
