import React from 'react';

interface LayoutProps {
  children: React.ReactNode[];
  isWideScreen: boolean;
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

/**
 * Responsive layout component
 * Wide screen: horizontal split
 * Narrow screen: vertical stack
 */
export function Layout({
  children,
  isWideScreen,
  onRefresh,
  showRefreshButton = true,
}: LayoutProps): React.JSX.Element {
  const [treeMap, cardPreview] = children;

  const layoutContent = (
    <>
      <div className="layout-section treemap-section">{treeMap}</div>
      <div className="layout-section preview-section">{cardPreview}</div>
    </>
  );

  const refreshButton = showRefreshButton && onRefresh && (
    <button className="refresh-button" onClick={onRefresh} title="Refresh data">
      🔄
    </button>
  );

  if (isWideScreen) {
    return (
      <div className="layout layout-wide">
        {refreshButton}
        {layoutContent}
      </div>
    );
  }

  return (
    <div className="layout layout-narrow">
      {refreshButton}
      {layoutContent}
    </div>
  );
}
