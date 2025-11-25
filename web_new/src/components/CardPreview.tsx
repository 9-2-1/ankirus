import React, { useState } from 'react';
import { CardData } from '../types/card';
import './CardPreview.css';

interface CardPreviewProps {
  card: CardData | null;
}

/**
 * Card preview component showing details of selected card
 */
export function CardPreview({ card }: CardPreviewProps): React.JSX.Element {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  if (!card) {
    return (
      <div className="card-preview empty">
        <h3>Card Preview</h3>
        <p>Select a card from the TreeMap to view details</p>
      </div>
    );
  }

  return (
    <div className="card-preview">
      <div className="preview-header">
        <h3>Card Details</h3>
        <div className="card-stats">
          <span className="stat">Retention: {Math.round(card.retentionRate * 100)}%</span>
          <span className="stat">Difficulty: {card.difficulty.toFixed(2)}</span>
          <span className="stat">Stability: {card.stability.toFixed(2)}</span>
          {card.paused && <span className="stat paused">Paused</span>}
        </div>

        {card.groupPath && card.groupPath.length > 0 && (
          <div className="card-group">
            <span className="group-label">Group:</span>
            <span className="group-path">{card.groupPath.join(' / ')}</span>
          </div>
        )}
      </div>

      <div className="card-content-area">
        <div className="card-front">
          <h4>Front</h4>
          <div className="card-content" dangerouslySetInnerHTML={{ __html: card.front }} />
        </div>

        <button className="show-answer-btn" onClick={() => setShowAnswer(!showAnswer)}>
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>

        {showAnswer && (
          <div className="card-back">
            <h4>Back</h4>
            <div className="card-content" dangerouslySetInnerHTML={{ __html: card.back }} />
          </div>
        )}
      </div>
    </div>
  );
}
