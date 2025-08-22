class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}
  // make vscode happy rgb(0, 128, 255)
  static rgb(r: number, g: number, b: number) {
    return new Color(r, g, b);
  }
  interpolate(other: Color, t: number): Color {
    const {
      l: l1,
      a: a1,
      b: b1,
    } = convertRgbToOklab({ r: this.r, g: this.g, b: this.b });
    const {
      l: l2,
      a: a2,
      b: b2,
    } = convertRgbToOklab({ r: other.r, g: other.g, b: other.b });
    const { r, g, b } = convertOklabToRgb({
      l: l1 + (l2 - l1) * t,
      a: a1 + (a2 - a1) * t,
      b: b1 + (b2 - b1) * t,
    });
    return new Color(r, g, b);
  }
  toString(): string {
    return `rgb(${this.r}, ${this.g}, ${this.b})`;
  }
}

function colorLine(colormap: Array<[number, Color]>, value: number): Color {
  if (value <= colormap[0][0]) {
    return colormap[0][1];
  }
  for (let i = 0; i < colormap.length - 1; i++) {
    if (value <= colormap[i + 1][0]) {
      return colormap[i][1].interpolate(
        colormap[i + 1][1],
        (value - colormap[i][0]) / (colormap[i + 1][0] - colormap[i][0]),
      );
    }
  }
  return colormap[colormap.length - 1][1];
}

const black = Color.rgb(0, 0, 0);
const white = Color.rgb(255, 255, 255);
const colormaps: Record<
  "retention" | "stability",
  Record<"goldie" | "bluesea", Array<[number, Color]>>
> = {
  retention: {
    goldie: [
      [0, Color.rgb(240, 240, 240)],
      [0.8, Color.rgb(246, 198, 197)],
      [0.9, Color.rgb(211, 209, 110)],
      [0.95, Color.rgb(65, 200, 110)],
      [1.0, Color.rgb(47, 155, 249)],
    ],
    bluesea: [
      [0, Color.rgb(240, 240, 240)],
      [0.9, Color.rgb(198, 235, 254)],
      [1, Color.rgb(0, 170, 255)],
    ],
  },
  stability: {
    goldie: [
      [0, Color.rgb(240, 240, 240)],
      [1, Color.rgb(246, 198, 197)],
      [3, Color.rgb(211, 209, 110)],
      [7, Color.rgb(65, 200, 110)],
      [15, Color.rgb(47, 155, 249)],
    ],
    bluesea: [
      [0, Color.rgb(240, 240, 240)],
      [2, Color.rgb(198, 235, 254)],
      [15, Color.rgb(0, 170, 255)],
    ],
  },
};
