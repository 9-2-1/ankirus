// Color configuration for retention rate visualization
// [point, [r, g, b]] where point is retention rate (0-1)

export const retentionColors: Array<[number, [number, number, number]]> = [
  [0, [255, 255, 255]], // White at 0%
  [0.7, [255, 64, 64]], // Red at 70%
  [0.8, [192, 192, 0]], // Yellow at 80%
  [0.9, [0, 200, 0]], // Green at 90%
  [0.95, [0, 192, 192]], // Cyan at 95%
  [1, [0, 128, 255]], // Blue at 100%
];

export interface RGBColor {
  r: number;
  g: number;
  b: number;
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
 * Get border color (mixed with black)
 */
export function getBorderColor(retention: number): RGBColor {
  const color = interpolateColor(retention);
  // Mix with black: color / 2
  return { r: Math.round(color.r / 2), g: Math.round(color.g / 2), b: Math.round(color.b / 2) };
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
  return getBorderColor(retention);
}
