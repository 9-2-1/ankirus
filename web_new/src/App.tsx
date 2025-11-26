import React, { useState } from 'react';
import { CardGroup, CardData } from './types/card';
import { useCardData } from './hooks/useCardData';
import { useResponsive } from './hooks/useResponsive';
import { buildGroupHierarchy } from './utils/groupParser';
import { buildGroupList } from './utils/groupListBuilder';
import { Layout } from './components/Layout';
import { TreeMap } from './components/TreeMap';
import { CardPreview } from './components/CardPreview';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { PERFORMANCE_CONFIG } from './utils/performanceConfig';
import './styles/responsive.css';

/**
 * Main application component
 */
export function App(): React.JSX.Element {
  const { cards, loading, error, refetch } = useCardData();
  const { isWideScreen } = useResponsive();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedGroupPath, setSelectedGroupPath] = useState<string[] | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showErrorNotification, setShowErrorNotification] = useState<boolean>(false);

  // Auto-hide error notification after 5 seconds
  React.useEffect(() => {
    if (showErrorNotification) {
      const timer = setTimeout(() => {
        setShowErrorNotification(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showErrorNotification]);

  // Build group hierarchy from card data
  const groupHierarchy: CardGroup | null = cards.length > 0 ? buildGroupHierarchy(cards) : null;

  // Get selected card
  const selectedCard: CardData | null = selectedCardId
    ? cards.find(card => card.uniqueId === selectedCardId) || null
    : null;

  // Build group list for display
  const groupList = groupHierarchy ? buildGroupList(groupHierarchy, expandedGroups) : null;

  // Early returns must come after all hooks
  if (loading) {
    return <div className="loading">Loading card data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!groupHierarchy || !groupList) {
    return <div className="no-data">No card data available</div>;
  }

  // Event handlers
  const handleGroupSelect = (groupPath: string[] | null): void => {
    setSelectedGroupPath(groupPath);
    setSelectedCardId(null); // Clear card selection when group changes
  };

  const handleCardSelect = (cardId: string | null): void => {
    setSelectedCardId(cardId);
  };

  const handleGroupToggle = (groupPath: string[]): void => {
    const groupKey = groupPath.join('::');
    const newExpandedGroups = new Set(expandedGroups);

    if (newExpandedGroups.has(groupKey)) {
      newExpandedGroups.delete(groupKey);
    } else {
      newExpandedGroups.add(groupKey);
    }

    setExpandedGroups(newExpandedGroups);
  };

  const handleBackToGroupList = (): void => {
    setSelectedCardId(null);
  };

  const handleRefresh = async (): Promise<void> => {
    try {
      await refetch();
      // If refresh succeeds, hide any existing error notification
      setShowErrorNotification(false);
    } catch {
      // Show error notification in the corner
      setShowErrorNotification(true);
    }
  };

  const handleCloseErrorNotification = (): void => {
    setShowErrorNotification(false);
  };

  return (
    <>
      <Layout isWideScreen={isWideScreen}>
        <TreeMap
          group={groupHierarchy}
          selectedGroupPath={selectedGroupPath}
          onCardSelect={handleCardSelect}
          selectedCardId={selectedCardId}
        />
        <CardPreview
          card={selectedCard}
          groupList={groupList}
          selectedGroupPath={selectedGroupPath}
          onGroupSelect={handleGroupSelect}
          onGroupToggle={handleGroupToggle}
          onBackToGroupList={handleBackToGroupList}
          onRefresh={handleRefresh}
          showRefreshButton={!loading}
        />
      </Layout>
      <PerformanceMonitor
        cardCount={cards.length}
        isVisible={PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR}
      />

      {/* Error notification */}
      {showErrorNotification && (
        <div className="error-notification">
          <div className="error-content">
            <span className="error-message">Failed to refresh data: {error}</span>
            <button className="error-close" onClick={handleCloseErrorNotification} title="Close">
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
