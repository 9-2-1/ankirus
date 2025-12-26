// Color utilities for retention rate visualization
import type { RGBColor } from './colorConfig';
import { retentionColors } from './colorConfig';

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

/**
 * Interpolate color based on retention rate
 */
export function interpolateColor(retention: number): RGBColor {
  // Find the two closest color points
  let lowerIndex = 0;
  let upperIndex = retentionColors.length - 1;

  for (let i = 0; i < retentionColors.length - 1; i++) {
    const currentPoint = retentionColors[i]![0];
    const nextPoint = retentionColors[i + 1]![0];
    if (retention >= currentPoint && retention <= nextPoint) {
      lowerIndex = i;
      upperIndex = i + 1;
      break;
    }
  }

  const lower = retentionColors[lowerIndex]!;
  const upper = retentionColors[upperIndex]!;

  const [lowerPoint, lowerColor] = lower;
  const [upperPoint, upperColor] = upper;

  // Calculate interpolation factor
  const factor = (retention - lowerPoint) / (upperPoint - lowerPoint);

  // Interpolate RGB values
  const r = Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * factor);
  const g = Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * factor);
  const b = Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * factor);

  return { r, g, b };
}

/**
 * Get border color (mixed with white)
 */
export function getBorderColor(retention: number): RGBColor {
  const color = interpolateColor(retention);
  // Mix with white: (color + white) / 2
  return { r: Math.round((color.r + 255) / 2), g: Math.round((color.g + 255) / 2), b: Math.round((color.b + 255) / 2) };
}

/**
 * Convert RGB color to CSS string
 */
export function rgbToCss(color: RGBColor): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Get text color by mixing background color with 50% black
 */
export function getTextColor(retention: number): RGBColor {
  const color = interpolateColor(retention);
  // Mix with white: color / 2
  return { r: Math.round(color.r / 2), g: Math.round(color.g / 2), b: Math.round(color.b / 2) };
}
