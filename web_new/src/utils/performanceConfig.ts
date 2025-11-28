// Performance configuration for TreeMap visualization

export const PERFORMANCE_CONFIG = {
  // Minimum area threshold for rendering nodes (pixels)
  MIN_NODE_AREA: 1,

  // Debounce time for resize events (milliseconds)
  RESIZE_DEBOUNCE_MS: 150,

  // Performance monitoring
  ENABLE_PERFORMANCE_MONITOR: process.env.NODE_ENV === 'development',
} as const;
