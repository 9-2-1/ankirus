// https://github.com/Evercoder/culori/blob/main/src/lrgb/convertRgbToLrgb.js
// https://github.com/Evercoder/culori/blob/main/src/lrgb/convertLrgbToRgb.js
// MIT License

function convertRgbToLrgb({ r, g, b }: { r: number; g: number; b: number }) {
  function fn(c: number) {
    const abs = Math.abs(c);
    if (abs <= 0.04045) {
      return c / 12.92;
    }
    return (Math.sign(c) || 1) * Math.pow((abs + 0.055) / 1.055, 2.4);
  }
  return {
    r: fn(r),
    g: fn(g),
    b: fn(b),
  };
}

const convertLrgbToRgb = ({ r, g, b }: { r: number; g: number; b: number }) => {
  function fn(c: number) {
    const abs = Math.abs(c);
    if (abs > 0.0031308) {
      return (Math.sign(c) || 1) * (1.055 * Math.pow(abs, 1 / 2.4) - 0.055);
    }
    return c * 12.92;
  }
  return {
    r: fn(r),
    g: fn(g),
    b: fn(b),
  };
};

// https://github.com/Evercoder/culori/blob/main/src/oklab/convertOklabToLrgb.js
// https://github.com/Evercoder/culori/blob/main/src/oklab/convertLrgbToOklab.js
// MIT License

function convertOklabToLrgb({ l, a, b }: { l: number; a: number; b: number }) {
  let L = Math.pow(l + 0.3963377773761749 * a + 0.2158037573099136 * b, 3);
  let M = Math.pow(l - 0.1055613458156586 * a - 0.0638541728258133 * b, 3);
  let S = Math.pow(l - 0.0894841775298119 * a - 1.2914855480194092 * b, 3);

  return {
    r: 4.0767416360759574 * L - 3.3077115392580616 * M + 0.2309699031821044 * S,
    g:
      -1.2684379732850317 * L + 2.6097573492876887 * M - 0.3413193760026573 * S,
    b:
      -0.0041960761386756 * L - 0.7034186179359362 * M + 1.7076146940746117 * S,
  };
}
function convertLrgbToOklab({ r, g, b }: { r: number; g: number; b: number }) {
  let L = Math.cbrt(
    0.412221469470763 * r + 0.5363325372617348 * g + 0.0514459932675022 * b,
  );
  let M = Math.cbrt(
    0.2119034958178252 * r + 0.6806995506452344 * g + 0.1073969535369406 * b,
  );
  let S = Math.cbrt(
    0.0883024591900564 * r + 0.2817188391361215 * g + 0.6299787016738222 * b,
  );

  return {
    l: 0.210454268309314 * L + 0.7936177747023054 * M - 0.0040720430116193 * S,
    a: 1.9779985324311684 * L - 2.4285922420485799 * M + 0.450593709617411 * S,
    b: 0.0259040424655478 * L + 0.7827717124575296 * M - 0.8086757549230774 * S,
  };
}

function convertRgbToOklab({ r, g, b }: { r: number; g: number; b: number }) {
  const V = convertRgbToLrgb({ r, g, b });
  return convertLrgbToOklab(V);
}
function convertOklabToRgb({ l, a, b }: { l: number; a: number; b: number }) {
  const V = convertOklabToLrgb({ l, a, b });
  return convertLrgbToRgb(V);
}

// OKLch
function convertOklabToOklch({ l, a, b }: { l: number; a: number; b: number }) {
  const c = Math.sqrt(a * a + b * b);
  const h = Math.atan2(b, a) * (180 / Math.PI);
  return { l: l, c: c, h: h };
}
function convertOklchToOklab({ l, c, h }: { l: number; c: number; h: number }) {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  return { l: l, a: a, b: b };
}

function convertRgbToOklch({ r, g, b }: { r: number; g: number; b: number }) {
  const V = convertRgbToOklab({ r, g, b });
  return convertOklabToOklch(V);
}
function convertOklchToRgb({ l, c, h }: { l: number; c: number; h: number }) {
  const V = convertOklchToOklab({ l, c, h });
  return convertOklabToRgb(V);
}
