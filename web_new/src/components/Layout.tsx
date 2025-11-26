import React from 'react';

interface LayoutProps {
  children: React.ReactNode[];
  isWideScreen: boolean;
}

/**
 * Responsive layout component
 * Wide screen: horizontal split
 * Narrow screen: vertical stack
 */
export function Layout({ children, isWideScreen }: LayoutProps): React.JSX.Element {
  const [treeMap, cardPreview] = children;

  if (isWideScreen) {
    return (
      <div className="layout layout-wide">
        <div className="layout-section treemap-section">{treeMap}</div>
        <div className="layout-section preview-section">{cardPreview}</div>
      </div>
    );
  }

  return (
    <div className="layout layout-narrow">
      <div className="layout-section treemap-section">{treeMap}</div>
      <div className="layout-section preview-section">{cardPreview}</div>
    </div>
  );
}
