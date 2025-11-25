import React, { useState } from 'react';
import { CardData, GroupListItem } from '../types/card';
import './CardPreview.css';

interface CardPreviewProps {
  card: CardData | null;
  groupList: GroupListItem | null;
  selectedGroupPath: string[] | null;
  onGroupSelect: (groupPath: string[] | null) => void;
  onGroupToggle: (groupPath: string[]) => void;
  onBackToGroupList: () => void;
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
}: CardPreviewProps): React.JSX.Element {
  const [showAnswer, setShowAnswer] = useState<boolean>(false);

  // Card preview mode
  if (card) {
    return (
      <div className="card-preview">
        <div className="preview-header">
          <div className="header-row">
            <h3>Card Details</h3>
            <button className="back-button" onClick={onBackToGroupList}>
              ← Back to Groups
            </button>
          </div>
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

  // Group list mode
  return (
    <div className="card-preview group-list">
      <div className="preview-header">
        <h3>Card Groups</h3>
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
            <span className={`expand-icon ${group.isExpanded ? 'expanded' : 'collapsed'}`}>
              {group.isExpanded ? 'v' : '>'}
            </span>
          )}
        </div>
        <div className="group-name">{group.name}</div>
        <div className="group-count">{group.totalCards}</div>
        <div className="group-retention">
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
