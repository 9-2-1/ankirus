<script lang="ts">
  import { buildGroupHierarchy } from './utils/groupParser';
  import { buildGroupList } from './utils/groupListBuilder';
  import Layout from './components/Layout.svelte';
  import TreeMap from './components/TreeMap.svelte';
  import CardPreview from './components/CardPreview.svelte';
  import PerformanceMonitor from './components/PerformanceMonitor.svelte';
  import { PERFORMANCE_CONFIG } from './utils/performanceConfig';
  import { SvelteSet } from 'svelte/reactivity';

  // Reactive state
  let selectedCardId: string | null = $state(null);
  let selectedGroupPath: string[] = $state([]);
  let expandedGroups = new SvelteSet<string>();
  let showErrorNotification = $state(false);

  // Custom hooks converted to stores
  import type { CardData } from './types/card';
  import { cardDataStore } from './stores/cardData';
  import { responsiveStore } from './stores/responsive';

  let cards: CardData[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let isWideScreen = $state(false);

  // Subscribe to stores
  $effect(() => {
    const unsubscribe = cardDataStore.subscribe(state => {
      cards = state.cards;
      loading = state.loading;
      error = state.error;
    });

    const unsubscribeResponsive = responsiveStore.subscribe(state => {
      isWideScreen = state.isWideScreen;
    });

    return () => {
      unsubscribe();
      unsubscribeResponsive();
    };
  });

  const refetch = () => cardDataStore.refetch();

  // Auto-hide error notification after 5 seconds
  $effect(() => {
    if (showErrorNotification) {
      const timer = setTimeout(() => {
        showErrorNotification = false;
      }, 5000);
      return () => clearTimeout(timer);
    }
  });

  // Build group hierarchy from card data
  const groupHierarchy = $derived(cards.length > 0 ? buildGroupHierarchy(cards) : null);

  // Get selected card
  const selectedCard = $derived(
    selectedCardId ? cards.find(card => card.uniqueId === selectedCardId) || null : null
  );

  // Build group list for display
  const groupList = $derived(
    groupHierarchy ? buildGroupList(groupHierarchy, expandedGroups) : null
  );

  // Event handlers
  function handleGroupSelect(groupPath: string[]): void {
    selectedGroupPath = groupPath;
    selectedCardId = null; // Clear card selection when group changes
  }

  function handleCardSelect(cardId: string | null): void {
    selectedCardId = cardId;
  }

  function handleGroupToggle(groupPath: string[]): void {
    const groupKey = groupPath.join('::');

    if (expandedGroups.has(groupKey)) {
      expandedGroups.delete(groupKey);
    } else {
      expandedGroups.add(groupKey);
    }
  }

  function handleBackToGroupList(): void {
    selectedCardId = null;
  }

  async function handleRefresh(): Promise<void> {
    try {
      await refetch();
      // If refresh succeeds, hide any existing error notification
      showErrorNotification = false;
    } catch {
      // Show error notification in the corner
      showErrorNotification = true;
    }
  }

  function handleCloseErrorNotification(): void {
    showErrorNotification = false;
  }
</script>

<!-- Loading state -->
{#if loading}
  <div class="loading">Loading card data...</div>

  <!-- Error state -->
{:else if error}
  <div class="error">Error: {error}</div>

  <!-- No data state -->
{:else if !groupHierarchy || !groupList}
  <div class="no-data">No card data available</div>

  <!-- Main content -->
{:else}
  <Layout {isWideScreen}>
    {#snippet treemap()}
      <TreeMap
        group={groupHierarchy}
        onCardSelect={handleCardSelect}
        {selectedGroupPath}
        {selectedCardId}
      />
    {/snippet}
    {#snippet preview()}
      <CardPreview
        card={selectedCard}
        {groupList}
        {selectedGroupPath}
        onGroupSelect={handleGroupSelect}
        onGroupToggle={handleGroupToggle}
        onBackToGroupList={handleBackToGroupList}
        onRefresh={handleRefresh}
        showRefreshButton={!loading}
      />
    {/snippet}
  </Layout>
  <PerformanceMonitor
    cardCount={cards.length}
    isVisible={PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR}
  />

  <!-- Error notification -->
  {#if showErrorNotification}
    <div class="error-notification">
      <div class="error-content">
        <span class="error-message">Failed to refresh data: {error}</span>
        <button class="error-close" onclick={handleCloseErrorNotification} title="Close">
          ✕
        </button>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Global styles */
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }

  .loading,
  .error,
  .no-data {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    font-size: 18px;
  }

  .error {
    color: #d32f2f;
  }

  .no-data {
    color: #666;
  }

  /* Error notification styles */
  .error-notification {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 1001;
    background-color: #f44336;
    color: white;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: slideIn 0.3s ease-out;
  }

  .error-content {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
  }

  .error-message {
    flex: 1;
    font-size: 14px;
    max-width: 300px;
  }

  .error-close {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    border-radius: 3px;
    transition: background-color 0.2s;
  }

  .error-close:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
