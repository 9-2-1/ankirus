import React, { useState } from 'react';
import { CardGroup, CardData } from './types/card';
import { useCardData } from './hooks/useCardData';
import { useResponsive } from './hooks/useResponsive';
import { buildGroupHierarchy } from './utils/groupParser';
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
  const { cards, loading, error } = useCardData();
  const { isWideScreen } = useResponsive();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Build group hierarchy from card data
  const groupHierarchy: CardGroup | null = cards.length > 0 ? buildGroupHierarchy(cards) : null;

  // Get selected card
  const selectedCard: CardData | null = selectedCardId
    ? cards.find(card => card.uniqueId === selectedCardId) || null
    : null;

  if (loading) {
    return <div className="loading">Loading card data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!groupHierarchy) {
    return <div className="no-data">No card data available</div>;
  }

  return (
    <>
      <Layout isWideScreen={isWideScreen}>
        <TreeMap
          group={groupHierarchy}
          onCardSelect={setSelectedCardId}
          selectedCardId={selectedCardId}
        />
        <CardPreview card={selectedCard} />
      </Layout>
      <PerformanceMonitor
        cardCount={cards.length}
        isVisible={PERFORMANCE_CONFIG.ENABLE_PERFORMANCE_MONITOR}
      />
    </>
  );
}
