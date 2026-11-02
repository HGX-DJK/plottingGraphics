/**
 * 颜色工具函数（取色器专用）
 *
 * 自研取色器需要在自己的 RGB / HSL 之间换算，
 * 这里集中实现，保证与浏览器 CSS 色彩空间一致。
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  h: number; // 0~360
  s: number; // 0~1
  l: number; // 0~1
}

/** 十六进制颜色正则：#rgb / #rrggbb */
const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

/** 把 0~255 的通道值转成两位十六进制 */
const toHexPair = (v: number): string =>
  clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');

/**
 * 解析十六进制颜色为 RGB。
 *
 * 兼容 3 位简写（#fff）与 6 位标准（#ffffff），
 * 也接受不带 # 的写法。非法输入返回 null。
 */
export function parseHex(hex: string): Rgb | null {
  if (typeof hex !== 'string') return null;
  const trimmed = hex.trim();
  const m = HEX_RE.exec(trimmed);
  if (!m) return null;
  let body = m[1];
  if (body.length === 3) {
    body = body[0] + body[0] + body[1] + body[1] + body[2] + body[2];
  }
  const num = parseInt(body, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/** 把 RGB 格式化为小写十六进制（#rrggbb） */
export function formatHex(rgb: Rgb): string {
  return `#${toHexPair(rgb.r)}${toHexPair(rgb.g)}${toHexPair(rgb.b)}`;
}

/** RGB 转 HSL（h: 0~360，s/l: 0~1） */
export function rgbToHsl(rgb: Rgb): Hsl {
  const r = clamp(rgb.r, 0, 255) / 255;
  const g = clamp(rgb.g, 0, 255) / 255;
  const b = clamp(rgb.b, 0, 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l };
  }

  const s = delta / (1 - Math.abs(2 * l - 1));

  let h: number;
  if (max === r) {
    h = ((g - b) / delta) % 6;
  } else if (max === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

/** HSL 转 RGB */
export function hslToRgb(hsl: Hsl): Rgb {
  const h = ((hsl.h % 360) + 360) % 360;
  const s = clamp(hsl.s, 0, 1);
  const l = clamp(hsl.l, 0, 1);

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb: [number, number, number];
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return {
    r: Math.round((rgb[0] + m) * 255),
    g: Math.round((rgb[1] + m) * 255),
    b: Math.round((rgb[2] + m) * 255),
  };
}

/**
 * 规范化任意颜色输入为 #rrggbb。
 *
 * 要素属性里的颜色理论上都是标准 hex，但历史数据或外部导入
 * 可能带 # 前缀缺失、3 位简写或大写，这里统一收敛，
 * 避免把非法值写进地图渲染。
 */
export function normalizeHex(value: string | undefined | null, fallback = '#3b82f6'): string {
  const parsed = parseHex(value || '');
  return parsed ? formatHex(parsed) : fallback;
}

/**
 * 判断颜色在深色底上是否需要浅色前景（WCAG 相对亮度）。
 */
export function isDarkColor(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum =
    0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  return lum < 0.45;
}

/**
 * GIS 专题配色预设。
 *
 * 这些色值取自项目既有的图层与要素调色板（规划红线 / 水系 / 生态绿化 等），
 * 与应用其他部位的视觉保持一致，避免出现两套割裂的配色。
 */
export const GIS_COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: '规划红线', hex: '#ef4444' },
  { name: '江河水系', hex: '#3b82f6' },
  { name: '生态绿化', hex: '#10b981' },
  { name: '管制边界', hex: '#f59e0b' },
  { name: '重点设施', hex: '#8b5cf6' },
  { name: '勘界廊道', hex: '#06b6d4' },
  { name: '基准参照', hex: '#94a3b8' },
  { name: '地灾隐患', hex: '#f97316' },
  { name: '核心城区', hex: '#ec4899' },
  { name: '产业园区', hex: '#84cc16' },
  { name: '深空夜幕', hex: '#0f172a' },
  { name: '纯白高亮', hex: '#ffffff' },
];
