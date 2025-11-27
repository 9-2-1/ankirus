<script lang="ts">
  import type { CardData, GroupListItem } from '../types/card';
  import { interpolateColor, getTextColor, rgbToCss } from '../utils/color';
  import CardContent from './CardContent.svelte';
  import GroupList from './GroupList.svelte';

  let {
    card,
    groupList,
    selectedGroupPath,
    onGroupSelect,
    onGroupToggle,
    onBackToGroupList,
    onRefresh,
    showRefreshButton = true,
  }: {
    card: CardData | null;
    groupList: GroupListItem | null;
    selectedGroupPath: string[] | null;
    onGroupSelect: (groupPath: string[]) => void;
    onGroupToggle: (groupPath: string[]) => void;
    onBackToGroupList: () => void;
    onRefresh?: () => void;
    showRefreshButton?: boolean;
  } = $props();

  let showAnswer = $state(false);

  // Derived values for card stats
  const retentionColor = $derived(card ? interpolateColor(card.retentionRate) : null);
  const textColor = $derived(card ? getTextColor(card.retentionRate) : null);
</script>

{#if card}
  <!-- Card preview mode -->
  <div class="card-preview">
    <div class="preview-header">
      <div class="header-row">
        <h3>Card Details</h3>
        <div class="header-actions">
          <button class="back-button" onclick={onBackToGroupList}> ← Back to Groups </button>
          {#if showRefreshButton && onRefresh}
            <button class="refresh-button" onclick={onRefresh} title="Refresh data"> 🔄 </button>
          {/if}
        </div>
      </div>
      <div class="card-stats">
        {#if card && retentionColor && textColor}
          <span
            class="stat"
            style="background-color: {rgbToCss(retentionColor)}; color: {rgbToCss(textColor)}"
          >
            Retention: {Math.round(card.retentionRate * 100)}%
          </span>
          <span
            class="stat"
            style="background-color: {rgbToCss(retentionColor)}; color: {rgbToCss(textColor)}"
          >
            Difficulty: {card.difficulty.toFixed(2)}
          </span>
          <span
            class="stat"
            style="background-color: {rgbToCss(retentionColor)}; color: {rgbToCss(textColor)}"
          >
            Stability: {card.stability.toFixed(2)}
          </span>
          {#if card.paused}
            <span class="stat paused">Paused</span>
          {/if}
        {/if}
      </div>

      {#if card.groupPath && card.groupPath.length > 0}
        <div class="card-group">
          <span class="group-label">Group:</span>
          <span class="group-path">{card.groupPath.join(' / ')}</span>
        </div>
      {/if}
    </div>

    <div class="card-content-area">
      <div class="card-front">
        <h4>Front</h4>
        <CardContent content={card.front} />
      </div>

      <button class="show-answer-btn" onclick={() => (showAnswer = !showAnswer)}>
        {showAnswer ? 'Hide Answer' : 'Show Answer'}
      </button>

      {#if showAnswer}
        <div class="card-back">
          <h4>Back</h4>
          <CardContent content={card.back} />
        </div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Group list mode -->
  <div class="card-preview group-list">
    <div class="preview-header">
      <div class="header-row">
        <h3>Card Groups</h3>
        {#if showRefreshButton && onRefresh}
          <button class="refresh-button" onclick={onRefresh} title="Refresh data"> 🔄 </button>
        {/if}
      </div>
      <div class="group-list-header">
        <span class="header-name">Name</span>
        <span class="header-count">Total</span>
        <span class="header-retention">Avg Retention</span>
      </div>
    </div>

    <div class="group-list-content">
      {#if groupList}
        <GroupList
          group={groupList}
          {selectedGroupPath}
          {onGroupSelect}
          {onGroupToggle}
          level={0}
        />
      {/if}
    </div>
  </div>
{/if}

<style>
  /* CardPreview component styles */
  .card-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: white;
  }

  /* Group list mode styles */
  .card-preview.group-list {
    overflow-y: auto;
  }

  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .back-button {
    padding: 6px 12px;
    background-color: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    color: #666;
  }

  .back-button:hover {
    background-color: #e0e0e0;
  }

  .refresh-button {
    padding: 6px 10px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
  }

  .refresh-button:hover {
    background-color: #1565c0;
  }

  .group-list-header {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid #e0e0e0;
    font-weight: 600;
    color: #666;
    font-size: 14px;
  }

  .group-list-content {
    flex: 1;
    overflow-y: auto;
  }

  .preview-header {
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
    background-color: #fafafa;
  }

  .preview-header h3 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 20px;
  }

  .card-stats {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  .stat {
    padding: 6px 12px;
    background-color: #e3f2fd;
    border-radius: 6px;
    font-size: 14px;
    color: #1976d2;
    font-weight: 500;
  }

  .stat.paused {
    background-color: #ffebee;
    color: #c62828;
  }

  .card-content-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .card-front,
  .card-back {
    margin-bottom: 20px;
    padding: 16px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background-color: #fafafa;
  }

  .card-front h4,
  .card-back h4 {
    margin: 0 0 12px 0;
    color: #333;
    font-size: 16px;
    font-weight: 600;
  }

  .show-answer-btn {
    padding: 10px 20px;
    background-color: #1976d2;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 20px;
    transition: background-color 0.2s;
  }

  .show-answer-btn:hover {
    background-color: #1565c0;
  }

  .card-group {
    margin-top: 12px;
    padding: 8px 12px;
    background-color: #f5f5f5;
    border-radius: 6px;
    font-size: 14px;
  }

  .group-label {
    font-weight: 600;
    color: #666;
    margin-right: 8px;
  }

  .group-path {
    color: #333;
    font-family: monospace;
  }
</style>
