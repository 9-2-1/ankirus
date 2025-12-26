// TreeMap related types
import type { CardData } from './card';

export interface TreeMapNode {
  name: string;
  path: string[];
  value: number;
  children?: TreeMapNode[];
  cardCount: number;
  averageRetention: number;
  cardData?: CardData; // For leaf nodes representing individual cards
}

export interface TreeMapRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  data: TreeMapNode;
}

export interface TreeMapLayout {
  nodes: TreeMapRect[];
  groupNodes: TreeMapRect[]; // Group nodes for borders
  width: number;
  height: number;
}
