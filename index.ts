import cn, { RGB } from 'color-name';
import swizzle from 'simple-swizzle';

export interface ColorString {
  get: {
    (str: string): ColorModel | null;
    rgb(str: string): ColorNumExp | null;
    hsl(str: string): ColorNumExp | null;
    hwb(str: string): ColorNumExp | null;
  };
  to: {
    hex(...args: ColorArrayishExp): string;
    rgb: {
      (...args: ColorArrayishExp): string;
      percent(...args: ColorArrayishExp): string;
    };
    hsl(...args: ColorArrayishExp): string;
    hwb(...args: ColorArrayishExp): string;
    keyword(rgb: ColorArray): string;
  };
}

export type ReverseColorNames = { [k: string]: string };
export type ColorModel = {
  model: string;
  value: ColorNumExp;
};
export type ColorNumExp = [number, number, number, number];
export type ColorArray = number[];
export type ColorArrayishExp = Array<number | number[]>;
export type ColorStrExp = string;

export const colorNames: { [k: string]: RGB } = cn;
export const reverseNames: ReverseColorNames = {};

for (let name in colorNames) {
  if (colorNames.hasOwnProperty(name)) {
    const RGBStr = colorNames[name].toString();
    reverseNames[RGBStr] = name;
  }
}

const get = (str: string): ColorModel | null => {
  const prefix = str.substring(0, 3).toLowerCase();
  let value: ColorNumExp | null;
  let model: string;
  switch (prefix) {
    case 'hsl':
      value = getHsl(str);
      model = 'hsl';
      break;
    case 'hwb':
      value = getHwb(str);
      model = 'hwb';
      break;
    default:
      value = getRgb(str);
      model = 'rgb';
      break;
  }

  if (!value) {
    return null;
  }

  return {
    model,
    value,
  };
};

const getRgb = (str: string): ColorNumExp | null => {
  if (!str) {
    return null;
  }

  const abbr = /^#([a-f0-9]{3,4})$/i;
  const hex = /^#([a-f0-9]{6})([a-f0-9]{2})?$/i;
  const rgba = /^rgba?\(\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*,\s*([+-]?\d+)\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
  const per = /^rgba?\(\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*,\s*([+-]?[\d\.]+)\%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
  const keyword = /(\D+)/;

  const rgb: ColorNumExp = [0, 0, 0, 1];
  let match: RegExpMatchArray | null;
  let hexAlpha;

  if ((match = str.match(hex))) {
    hexAlpha = match[2];
    const matchHex = match[1];

    for (let i = 0; i < 3; i++) {
      const i2 = i * 2;
      rgb[i] = parseInt(matchHex.slice(i2, i2 + 2), 16);
    }

    if (hexAlpha) {
      rgb[3] = parseInt(hexAlpha, 16) / 255;
    }
  } else if ((match = str.match(abbr))) {
    const matchStr = match[1];
    hexAlpha = matchStr[3];

    for (let i = 0; i < 3; i++) {
      rgb[i] = parseInt(matchStr[i] + matchStr[i], 16);
    }

    if (hexAlpha) {
      rgb[3] = parseInt(hexAlpha + hexAlpha, 16) / 255;
    }
  } else if ((match = str.match(rgba))) {
    for (let i = 0; i < 3; i++) {
      rgb[i] = parseInt(match[i + 1], 0);
    }

    if (match[4]) {
      rgb[3] = parseFloat(match[4]);
    }
  } else if ((match = str.match(per))) {
    for (let i = 0; i < 3; i++) {
      rgb[i] = Math.round(parseFloat(match[i + 1]) * 2.55);
    }

    if (match[4]) {
      rgb[3] = parseFloat(match[4]);
    }
  } else if ((match = str.match(keyword))) {
    if (match[1] === 'transparent') {
      return [0, 0, 0, 0];
    }

    const rgbArr: [number, number, number] = colorNames[match[1]];

    if (!rgbArr) {
      return null;
    }

    const rgbKeyword: ColorNumExp = [...rgbArr, 1];

    return rgbKeyword;
  } else {
    return null;
  }

  for (let i = 0; i < 3; i++) {
    rgb[i] = clamp(rgb[i], 0, 255);
  }
  rgb[3] = clamp(rgb[3], 0, 1);

  return rgb;
};

const getHsl = (str: string): ColorNumExp | null => {
  if (!str) {
    return null;
  }

  const hsl = /^hsla?\(\s*([+-]?(?:\d*\.)?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
  const match = str.match(hsl);

  if (match) {
    const alpha = parseFloat(match[4]);
    const h = (parseFloat(match[1]) + 360) % 360;
    const s = clamp(parseFloat(match[2]), 0, 100);
    const l = clamp(parseFloat(match[3]), 0, 100);
    const a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);

    return [h, s, l, a];
  }

  return null;
};

const getHwb = (str: string): ColorNumExp | null => {
  if (!str) {
    return null;
  }

  const hwb = /^hwb\(\s*([+-]?\d*[\.]?\d+)(?:deg)?\s*,\s*([+-]?[\d\.]+)%\s*,\s*([+-]?[\d\.]+)%\s*(?:,\s*([+-]?[\d\.]+)\s*)?\)$/;
  const match = str.match(hwb);

  if (match) {
    const alpha = parseFloat(match[4]);
    const h = ((parseFloat(match[1]) % 360) + 360) % 360;
    const w = clamp(parseFloat(match[2]), 0, 100);
    const b = clamp(parseFloat(match[3]), 0, 100);
    const a = clamp(isNaN(alpha) ? 1 : alpha, 0, 1);
    return [h, w, b, a];
  }

  return null;
};

const convert2Hex = (...args: ColorArrayishExp): ColorStrExp => {
  const rgba = swizzle(args);

  return (
    '#' +
    hexDouble(rgba[0]) +
    hexDouble(rgba[1]) +
    hexDouble(rgba[2]) +
    (parseFloat(rgba[3]) < 1 ? hexDouble(Math.round(rgba[3] * 255)) : '')
  );
};

const convert2Rgb = (...args: ColorArrayishExp): ColorStrExp => {
  const rgba = swizzle(args);

  return rgba.length < 4 || parseFloat(rgba[3]) === 1
    ? 'rgb(' +
        Math.round(rgba[0]) +
        ', ' +
        Math.round(rgba[1]) +
        ', ' +
        Math.round(rgba[2]) +
        ')'
    : 'rgba(' +
        Math.round(rgba[0]) +
        ', ' +
        Math.round(rgba[1]) +
        ', ' +
        Math.round(rgba[2]) +
        ', ' +
        rgba[3] +
        ')';
};

const convert2Percent = (...args: ColorArrayishExp): ColorStrExp => {
  const rgba = swizzle(args);

  const r = Math.round((parseFloat(rgba[0]) / 255) * 100);
  const g = Math.round((parseFloat(rgba[1]) / 255) * 100);
  const b = Math.round((parseFloat(rgba[2]) / 255) * 100);

  return rgba.length < 4 || parseFloat(rgba[3]) === 1
    ? 'rgb(' + r + '%, ' + g + '%, ' + b + '%)'
    : 'rgba(' + r + '%, ' + g + '%, ' + b + '%, ' + rgba[3] + ')';
};

const convert2Hsl = (...args: ColorArrayishExp): ColorStrExp => {
  const hsla = swizzle(args);

  return hsla.length < 4 || parseFloat(hsla[3]) === 1
    ? 'hsl(' + hsla[0] + ', ' + hsla[1] + '%, ' + hsla[2] + '%)'
    : 'hsla(' +
        hsla[0] +
        ', ' +
        hsla[1] +
        '%, ' +
        hsla[2] +
        '%, ' +
        hsla[3] +
        ')';
};

// hwb is a bit different than rgb(a) & hsl(a) since there is no alpha specific syntax
// (hwb have alpha optional & 1 is default value)
const convert2Hwb = (...args: ColorArrayishExp): ColorStrExp => {
  const hwba = swizzle(args);

  let a = '';
  if (hwba.length >= 4 && hwba[3] !== 1) {
    a = ', ' + hwba[3];
  }

  return 'hwb(' + hwba[0] + ', ' + hwba[1] + '%, ' + hwba[2] + '%' + a + ')';
};

const convert2Keyword = (rgb: ColorArray): ColorStrExp => {
  return reverseNames[rgb.slice(0, 3).toString()];
};

const clamp = (num: number, min: number, max: number) => {
  return Math.min(Math.max(min, num), max);
};

const hexDouble = (num: number) => {
  const str = num.toString(16).toUpperCase();
  return str.length < 2 ? '0' + str : str;
};

export const colorString: ColorString = {
  get: Object.assign(get, {
    rgb: getRgb,
    hsl: getHsl,
    hwb: getHwb,
  }),
  to: {
    hex: convert2Hex,
    rgb: Object.assign(convert2Rgb, {
      percent: convert2Percent,
    }),
    hsl: convert2Hsl,
    hwb: convert2Hwb,
    keyword: convert2Keyword,
  },
};
