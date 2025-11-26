import React, { useEffect, useState } from 'react';

interface PerformanceMonitorProps {
  cardCount: number;
  isVisible?: boolean;
}

/**
 * Performance monitoring component to help identify bottlenecks
 */
export function PerformanceMonitor({
  cardCount,
  isVisible = false,
}: PerformanceMonitorProps): React.JSX.Element | null {
  const [metrics, setMetrics] = useState({ fps: 0, memory: 0, layoutTime: 0, renderTime: 0 });

  useEffect(() => {
    if (!isVisible) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = () => {
      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        // Get memory usage if available
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory
          ? Math.round(
              (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
                .usedJSHeapSize / 1048576
            )
          : 0;

        setMetrics(prev => ({ ...prev, fps, memory }));

        frameCount = 0;
        lastTime = currentTime;
      }

      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="performance-monitor">
      <div className="performance-stats">
        <div>Cards: {cardCount}</div>
        <div>FPS: {metrics.fps}</div>
        <div>Memory: {metrics.memory}MB</div>
        <div>Layout: {metrics.layoutTime}ms</div>
        <div>Render: {metrics.renderTime}ms</div>
      </div>
    </div>
  );
}
