class Color {
  constructor(
    public r: number,
    public g: number,
    public b: number,
  ) {}
  RGB(): [number, number, number] {
    return [this.r, this.g, this.b];
  }
  interpolate(other: Color, t: number): Color {
    return new Color(
      this.r + (other.r - this.r) * t,
      this.g + (other.g - this.g) * t,
      this.b + (other.b - this.b) * t,
    );
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

const colormaps: Record<string, Record<string, Array<[number, Color]>>> = {
  retention: {
    goldie: [
      [0, new Color(0xf0, 0xf0, 0xf0)],
      [0.8, new Color(0xe8, 0xbf, 0xbf)],
      [0.9, new Color(0xff, 0xf7, 0x85)],
      [0.95, new Color(0x59, 0xe1, 0x5e)],
      [1.0, new Color(0x00, 0x88, 0xff)],
    ],
    bluesea: [
      [0, new Color(0xff, 0xff, 0xff)],
      [0.9, new Color(0xc0, 0xe0, 0xff)],
      [1, new Color(0x00, 0x88, 0xff)],
    ],
  },
  stability: {
    goldie: [
      [0, new Color(0xf0, 0xf0, 0xf0)],
      [1, new Color(0xe8, 0xbf, 0xbf)],
      [3, new Color(0xff, 0xf7, 0x85)],
      [7, new Color(0x59, 0xe1, 0x5e)],
      [15, new Color(0x00, 0x88, 0xff)],
    ],
    bluesea: [
      [0, new Color(0xff, 0xff, 0xff)],
      [1, new Color(0xc0, 0xe0, 0xff)],
      [15, new Color(0x00, 0x88, 0xff)],
    ],
  },
};
