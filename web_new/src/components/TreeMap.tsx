import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { CardGroup } from '../types/card';
import { TreeMapRect } from '../types/treemap';
import { useTreeMap } from '../hooks/useTreeMap';
import {
  getRetentionColor,
  getRetentionBorderColor,
  getContrastTextColor,
  interpolateColor,
} from '../utils/color';
import { retentionColors } from '../utils/colorConfig';
import { debounce } from '../utils/performance';
import { PERFORMANCE_CONFIG } from '../utils/performanceConfig';
import './TreeMap.css';

interface TreeMapProps {
  group: CardGroup;
  onCardSelect: (cardId: string | null) => void;
  selectedCardId: string | null;
}

/**
 * TreeMap visualization component using D3.js
 */
export function TreeMap({ group, onCardSelect, selectedCardId }: TreeMapProps): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isCalculating, setIsCalculating] = useState(false);

  // Calculate dimensions based on SVG container only
  useEffect(() => {
    const updateDimensions = (): void => {
      if (svgContainerRef.current) {
        const { width, height } = svgContainerRef.current.getBoundingClientRect();
        // Only update if dimensions actually changed
        if (width !== dimensions.width || height !== dimensions.height) {
          setDimensions({ width, height });
        }
      }
    };

    // Use debounced resize handler
    const debouncedResize = debounce(updateDimensions, PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS);

    updateDimensions();
    window.addEventListener('resize', debouncedResize);

    // Use ResizeObserver for more efficient dimension tracking
    let resizeObserver: ResizeObserver | null = null;
    if (svgContainerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(debouncedResize);
      resizeObserver.observe(svgContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [dimensions.width, dimensions.height]);

  // Calculate TreeMap layout with loading state
  const treeMapLayout = useTreeMap(group, dimensions.width, dimensions.height);

  // Show loading state when TreeMap is being calculated
  useEffect(() => {
    setIsCalculating(true);
    const timer = setTimeout(() => setIsCalculating(false), 100);
    return () => clearTimeout(timer);
  }, [treeMapLayout]);

  // Apply additional optimizations for high card counts
  const isHighCardCount = group.totalCards > PERFORMANCE_CONFIG.HIGH_CARD_COUNT_THRESHOLD;

  // Memoize click handler to prevent unnecessary re-renders
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, d: TreeMapRect) => {
      // Only select individual cards, not groups
      if (d.data.cardData) {
        onCardSelect(d.data.cardData.uniqueId);
      }
    },
    [onCardSelect]
  );

  // Render TreeMap using D3
  useEffect(() => {
    if (!treeMapLayout || !svgRef.current) return;

    const svg = d3.select(svgRef.current);

    // Clear previous content
    svg.selectAll('*').remove();

    // Use D3 join pattern for efficient updates of card nodes
    const nodeGroups = svg
      .selectAll<SVGGElement, TreeMapRect>('g.treemap-node')
      .data(
        treeMapLayout.nodes,
        (d: TreeMapRect) => d.data.cardData?.uniqueId || d.data.path.join('-')
      );

    // Remove old nodes
    nodeGroups.exit().remove();

    // Create new nodes
    const nodeEnter = nodeGroups
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .attr('class', 'treemap-node')
      .style('cursor', 'pointer')
      .on('click', handleNodeClick);

    // Precompute colors to reduce function calls
    const getNodeStyles = (d: TreeMapRect) => {
      const isPaused = d.data.cardData && d.data.cardData.paused;
      const isSelected = d.data.cardData && selectedCardId === d.data.cardData.uniqueId;

      return {
        fill: getRetentionColor(d.data.averageRetention),
        stroke: isPaused ? '#ff0000' : getRetentionBorderColor(d.data.averageRetention),
        strokeWidth: isPaused ? 2 : 0.5,
        className:
          `treemap-rect ${isSelected ? 'selected' : ''} ${isPaused ? 'paused' : ''}`.trim(),
      };
    };

    // Add rectangles for new nodes
    nodeEnter
      .append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => getNodeStyles(d).fill)
      .attr('stroke', d => getNodeStyles(d).stroke)
      .attr('stroke-width', d => getNodeStyles(d).strokeWidth)
      .attr('class', d => getNodeStyles(d).className);

    // Add text labels for new nodes (only for larger nodes)
    // Apply stricter thresholds for high card counts
    const minTextWidth = isHighCardCount
      ? PERFORMANCE_CONFIG.MIN_TEXT_WIDTH * 1.5
      : PERFORMANCE_CONFIG.MIN_TEXT_WIDTH;
    const minTextHeight = isHighCardCount
      ? PERFORMANCE_CONFIG.MIN_TEXT_HEIGHT * 1.5
      : PERFORMANCE_CONFIG.MIN_TEXT_HEIGHT;

    const textNodes = nodeEnter.filter(
      d => d.x1 - d.x0 > minTextWidth && d.y1 - d.y0 > minTextHeight
    );

    textNodes
      .append('text')
      .attr('x', 2)
      .attr('y', 10)
      .attr('fill', d => getContrastTextColor(interpolateColor(d.data.averageRetention)))
      .attr('font-size', '8px')
      .text(d => {
        // For individual cards, show retention percentage
        if (d.data.cardData) {
          return `${Math.round(d.data.averageRetention * 100)}%`;
        }
        // For groups, show group name
        const name = d.data.path[d.data.path.length - 1] || 'Root';
        return name.length > 8 ? name.substring(0, 6) + '...' : name;
      });

    // Update existing nodes
    const nodeUpdate = nodeGroups
      .merge(nodeEnter as d3.Selection<SVGGElement, TreeMapRect, SVGSVGElement, unknown>)
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Update rectangles for existing nodes
    nodeUpdate
      .select('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => getNodeStyles(d).fill)
      .attr('stroke', d => getNodeStyles(d).stroke)
      .attr('stroke-width', d => getNodeStyles(d).strokeWidth)
      .attr('class', d => getNodeStyles(d).className);

    // Update text for existing nodes
    nodeUpdate
      .select('text')
      .attr('fill', d => getContrastTextColor(interpolateColor(d.data.averageRetention)))
      .text(d => {
        if (d.data.cardData) {
          return `${Math.round(d.data.averageRetention * 100)}%`;
        }
        const name = d.data.path[d.data.path.length - 1] || 'Root';
        return name.length > 8 ? name.substring(0, 6) + '...' : name;
      });

    // Render group borders AFTER cards (so they appear on top)
    const groupGroups = svg
      .selectAll('g.treemap-group')
      .data(treeMapLayout.groupNodes)
      .enter()
      .append('g')
      .attr('transform', d => `translate(${d.x0},${d.y0})`)
      .attr('class', 'treemap-group');

    // Add white borders for groups
    groupGroups
      .append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', 'none')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '6,3')
      .attr('stroke-opacity', 0.8);
  }, [treeMapLayout, selectedCardId, handleNodeClick]);

  return (
    <div className="treemap-container" ref={containerRef}>
      <h3>Card Retention TreeMap</h3>
      <div className="treemap-svg-container" ref={svgContainerRef}>
        {isCalculating && <div className="treemap-loading">Calculating layout...</div>}
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="treemap-svg"
          style={{ opacity: isCalculating ? 0.5 : 1 }}
        />
      </div>
      <div className="treemap-legend">
        {retentionColors.map(([retention]) => (
          <div key={retention} className="legend-item">
            <span
              className="legend-color"
              style={{ backgroundColor: getRetentionColor(retention) }}
            ></span>
            <span>{Math.round(retention * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
