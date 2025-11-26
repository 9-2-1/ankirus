import React, { useState } from 'react';
import { CardData, GroupListItem } from '../types/card';
import { interpolateColor, getTextColor, rgbToCss } from '../utils/colorConfig';
import { CardContent } from './CardContent';
import './CardPreview.css';

interface CardPreviewProps {
  card: CardData | null;
  groupList: GroupListItem | null;
  selectedGroupPath: string[] | null;
  onGroupSelect: (groupPath: string[] | null) => void;
  onGroupToggle: (groupPath: string[]) => void;
  onBackToGroupList: () => void;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

/**
 * Right panel component showing either card details or group list
 */
export function CardPreview({
  card,
  groupList,
  selectedGroupPath,
  onGroupSelect,
  onGroupToggle,
  onBackToGroupList,
  onRefresh,
  showRefreshButton = true,
}: CardPreviewProps): React.JSX.Element {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  // Card preview mode
  if (card) {
    const retentionColor = interpolateColor(card.retentionRate);
    const textColor = getTextColor(card.retentionRate);
    const refreshButton = showRefreshButton && onRefresh && (
      <button className="refresh-button" onClick={onRefresh} title="Refresh data">
        🔄
      </button>
    );

    return (
      <div className="card-preview">
        <div className="preview-header">
          <div className="header-row">
            <h3>Card Details</h3>
            <div className="header-actions">
              <button className="back-button" onClick={onBackToGroupList}>
                ← Back to Groups
              </button>
              {refreshButton}
            </div>
          </div>
          <div className="card-stats">
            <span
              className="stat"
              style={{ backgroundColor: rgbToCss(retentionColor), color: rgbToCss(textColor) }}
            >
              Retention: {Math.round(card.retentionRate * 100)}%
            </span>
            <span
              className="stat"
              style={{ backgroundColor: rgbToCss(retentionColor), color: rgbToCss(textColor) }}
            >
              Difficulty: {card.difficulty.toFixed(2)}
            </span>
            <span
              className="stat"
              style={{ backgroundColor: rgbToCss(retentionColor), color: rgbToCss(textColor) }}
            >
              Stability: {card.stability.toFixed(2)}
            </span>
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
            <CardContent content={card.front} />
          </div>

          <button className="show-answer-btn" onClick={() => setShowAnswer(!showAnswer)}>
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>

          {showAnswer && (
            <div className="card-back">
              <h4>Back</h4>
              <CardContent content={card.back} />
            </div>
          )}
        </div>
      </div>
    );
  }

  const refreshButton = showRefreshButton && onRefresh && (
    <button className="refresh-button" onClick={onRefresh} title="Refresh data">
      🔄
    </button>
  );

  // Group list mode
  return (
    <div className="card-preview group-list">
      <div className="preview-header">
        <div className="header-row">
          <h3>Card Groups</h3>
          {refreshButton}
        </div>
        <div className="group-list-header">
          <span className="header-name">Name</span>
          <span className="header-count">Total</span>
          <span className="header-retention">Avg Retention</span>
        </div>
      </div>

      <div className="group-list-content">
        {groupList && (
          <GroupList
            group={groupList}
            selectedGroupPath={selectedGroupPath}
            onGroupSelect={onGroupSelect}
            onGroupToggle={onGroupToggle}
            level={0}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Recursive component for rendering group hierarchy
 */
interface GroupListProps {
  group: GroupListItem;
  selectedGroupPath: string[] | null;
  onGroupSelect: (groupPath: string[] | null) => void;
  onGroupToggle: (groupPath: string[]) => void;
  level: number;
}

function GroupList({
  group,
  selectedGroupPath,
  onGroupSelect,
  onGroupToggle,
  level,
}: GroupListProps): React.JSX.Element {
  const isSelected = selectedGroupPath && selectedGroupPath.join('::') === group.path.join('::');
  const hasSubgroups = group.subgroups.length > 0;

  const handleGroupClick = (): void => {
    if (hasSubgroups) {
      onGroupToggle(group.path);
    }
  };

  const handleGroupDoubleClick = (): void => {
    onGroupSelect(group.path);
  };

  return (
    <div className="group-item">
      <div
        className={`group-row ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleGroupClick}
        onDoubleClick={handleGroupDoubleClick}
      >
        <div className="group-expand">
          {hasSubgroups && (
            <span className={`expand-icon ${group.isExpanded ? 'expanded' : 'collapsed'}`} />
          )}
        </div>
        <div className="group-name">{group.name}</div>
        <div className="group-count">{group.totalCards}</div>
        <div
          className="group-retention"
          style={{
            color: group.totalCards > 0 ? rgbToCss(getTextColor(group.averageRetention)) : '#666',
            fontWeight: group.totalCards > 0 ? 'bold' : 'normal',
          }}
        >
          {group.totalCards > 0 ? `${(group.averageRetention * 100).toFixed(2)}%` : '-'}
        </div>
      </div>

      {group.isExpanded && hasSubgroups && (
        <div className="group-subgroups">
          {group.subgroups.map((subgroup, index) => (
            <GroupList
              key={index}
              group={subgroup}
              selectedGroupPath={selectedGroupPath}
              onGroupSelect={onGroupSelect}
              onGroupToggle={onGroupToggle}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
