<script lang="ts">
  import type { CardGroup } from '../types/card';
  import type { TreeMapRect } from '../types/treemap';
  import { calculateTreeMap } from '../utils/treeMap';
  import { getRetentionColor, getRetentionBorderColor } from '../utils/color';
  import { retentionColors } from '../utils/colorConfig';
  import { findGroupByPath } from '../utils/groupListBuilder';
  import { PERFORMANCE_CONFIG } from '../utils/performanceConfig';

  type Props = {
    group: CardGroup;
    onCardSelect: (cardId: string | null) => void;
    selectedGroupPath: string[];
    selectedCardId: string | null;
  };

  let { group, onCardSelect, selectedGroupPath, selectedCardId }: Props = $props();

  let containerWidth = $state(0);
  let containerHeight = $state(0);
  let debouncedWidth = $state(0);
  let debouncedHeight = $state(0);
  let debounceTimer = $state<number | null>(null);

  // Debounced dimension updates
  $effect(() => {
    // Set new timer
    const aWidth = containerWidth;
    const aHeight = containerHeight;
    debounceTimer = window.setTimeout(() => {
      debouncedWidth = aWidth;
      debouncedHeight = aHeight;
      debounceTimer = null;
    }, PERFORMANCE_CONFIG.RESIZE_DEBOUNCE_MS);
    // Cancel previous timer if exists
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    };
  });

  const displayRoot = $derived(findGroupByPath(group, selectedGroupPath));
  // Calculate TreeMap layout with debounced dimensions
  const treeMapLayout = $derived(
    displayRoot && calculateTreeMap(displayRoot, debouncedWidth, debouncedHeight)
  );

  // Helper function to get node styles
  function getNodeStyles(node: TreeMapRect): {
    fill: string;
    stroke: string;
    strokeWidth: number;
    classList: (string | Record<string, boolean>)[];
  } {
    const isPaused = Boolean(node.data.cardData && node.data.cardData.paused);
    const isSelected = Boolean(
      node.data.cardData && selectedCardId === node.data.cardData.uniqueId
    );

    return {
      fill: getRetentionColor(node.data.averageRetention),
      stroke: isPaused ? '#ff0000' : getRetentionBorderColor(node.data.averageRetention),
      strokeWidth: isPaused ? 2 : 0.5,
      classList: ['treemap-rect', { selected: isSelected, paused: isPaused }],
    };
  }
</script>

<div class="treemap-container">
  <h3>Card Retention TreeMap</h3>
  <div
    class="treemap-svg-container"
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
  >
    <svg width={containerWidth} height={containerHeight} class="treemap-svg">
      {#if treeMapLayout}
        <!-- Render card nodes -->
        {#each treeMapLayout.nodes as node (node.data.cardData?.uniqueId || node.data.path.join('::'))}
          {@const styles = getNodeStyles(node)}
          <rect
            class={styles.classList}
            style:cursor={node.data.cardData ? 'pointer' : 'default'}
            onclick={() => node.data.cardData && onCardSelect(node.data.cardData.uniqueId)}
            role="button"
            tabindex={node.data.cardData ? 0 : undefined}
            onkeydown={e => {
              if (node.data.cardData && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onCardSelect(node.data.cardData.uniqueId);
              }
            }}
            x={node.x0}
            y={node.y0}
            width={node.x1 - node.x0}
            height={node.y1 - node.y0}
            fill={styles.fill}
            stroke={styles.stroke}
            stroke-width={styles.strokeWidth}
          />
        {/each}

        <!-- Render group borders AFTER cards (so they appear on top) -->
        {#each treeMapLayout.groupNodes as groupNode (groupNode.data.path.join('-'))}
          <rect
            x={groupNode.x0}
            y={groupNode.y0}
            width={groupNode.x1 - groupNode.x0}
            height={groupNode.y1 - groupNode.y0}
            fill="none"
            stroke="black"
            stroke-width="3"
          />
        {/each}
      {/if}
    </svg>
  </div>
  <div class="treemap-legend">
    {#each retentionColors as [retention] (retention)}
      <div class="legend-item">
        <span class="legend-color" style:background-color={getRetentionColor(retention)}></span>
        <span>{Math.round(retention * 100)}%</span>
      </div>
    {/each}
  </div>
</div>

<style>
  /* TreeMap component styles */
  .treemap-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    padding: 16px;
    background-color: white;
    overflow: hidden; /* Prevent container from expanding */
  }

  .treemap-container h3 {
    margin: 0 0 16px 0;
    color: #333;
    font-size: 18px;
  }

  .treemap-svg-container {
    flex: 1;
    min-height: 0; /* Important for flex child scrolling */
    position: relative;
  }

  .treemap-svg {
    width: 100%;
    height: 100%;
    background-color: #fafafa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .treemap-legend {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 16px;
    padding: 12px;
    background-color: white;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #666;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border: 1px solid #ccc;
    border-radius: 3px;
  }

  /* Node selection states */
  .treemap-rect.selected {
    stroke: #007bff !important;
    stroke-width: 2px !important;
  }

  .treemap-rect.paused {
    stroke: #ff0000 !important;
    stroke-width: 2px !important;
  }
</style>
