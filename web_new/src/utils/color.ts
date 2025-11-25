// Color utilities for retention rate visualization
import { interpolateColor, getBorderColor, RGBColor } from './colorConfig';

export { interpolateColor } from './colorConfig';
export type { RGBColor } from './colorConfig';

/**
 * Convert RGBColor to CSS string
 */
export function rgbToString(color: RGBColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Get color for retention rate using interpolation
 */
export function getRetentionColor(retention: number): string {
  // Clamp retention to [0, 1]
  const clampedRetention = Math.max(0, Math.min(1, retention));
  return rgbToString(interpolateColor(clampedRetention));
}

/**
 * Get border color (half intensity of the original color)
 */
export function getRetentionBorderColor(retention: number): string {
  // Clamp retention to [0, 1]
  const clampedRetention = Math.max(0, Math.min(1, retention));
  return rgbToString(getBorderColor(clampedRetention));
}

/**
 * Generate text color that contrasts with background
 */
export function getContrastTextColor(backgroundColor: RGBColor): string {
  // Calculate relative luminance
  const luminance =
    (0.299 * backgroundColor.r + 0.587 * backgroundColor.g + 0.114 * backgroundColor.b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
