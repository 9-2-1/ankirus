const oklchConverter = useOklchConverter();

function m360(x: number) {
  return (x + 360) % 360;
}
function r360(x: number) {
  return ((x + 180) % 360) - 180;
}

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
      c: c1,
      h: h1,
    } = oklchConverter.rgbToOklch({ r: this.r, g: this.g, b: this.b });
    const {
      l: l2,
      c: c2,
      h: h2,
    } = oklchConverter.rgbToOklch({ r: other.r, g: other.g, b: other.b });
    const { r, g, b } = oklchConverter.oklchToRGB({
      l: m360(l1 + r360(l2 - l1) * t),
      c: c1 + (c2 - c1) * t,
      h: h1 + (h2 - h1) * t,
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
