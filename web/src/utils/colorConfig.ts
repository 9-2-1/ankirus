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
