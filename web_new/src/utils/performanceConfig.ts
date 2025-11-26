// Performance configuration for TreeMap visualization

export const PERFORMANCE_CONFIG = {
  // Minimum area threshold for rendering nodes (pixels)
  MIN_NODE_AREA: 1,

  // Minimum dimensions for text labels (pixels)
  MIN_TEXT_WIDTH: 50,
  MIN_TEXT_HEIGHT: 25,

  // Debounce time for resize events (milliseconds)
  RESIZE_DEBOUNCE_MS: 150,

  // Threshold for when to apply additional optimizations
  HIGH_CARD_COUNT_THRESHOLD: 500,

  // Performance monitoring
  ENABLE_PERFORMANCE_MONITOR: process.env.NODE_ENV === 'development',
} as const;
