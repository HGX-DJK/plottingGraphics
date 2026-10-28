/**
 * 战术标号与图标生成器
 * 生成跨平台 100% 兼容的 SVG Base64 Data URI (支持 WebGL Canvas 与移动端 Safari / Chrome)
 */

export function createTacticalIcon(type: string, color = '#ef4444', text = ''): string {
  let innerSvg = '';

  switch (type) {
    case 'post-command':
      // 军事指挥所图标 (战术旗与五角星)
      innerSvg = `
        <ellipse cx="24" cy="40" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <polygon points="24,6 40,36 8,36" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
        <polygon points="24,14 26.5,21 34,21 28,25.5 30,33 24,28.5 18,33 20,25.5 14,21 21.5,21" fill="#ffffff" />
      `;
      break;

    case 'post-radar':
      // 预警雷达阵地 (天线与对空侦测同心波)
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <circle cx="24" cy="22" r="18" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" />
        <path d="M 12 34 A 14 14 0 0 1 36 34" fill="none" stroke="#ffffff" stroke-width="2.5" />
        <path d="M 17 34 A 8 8 0 0 1 31 34" fill="none" stroke="#ffffff" stroke-width="2" />
        <line x1="24" y1="34" x2="24" y2="12" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="24" cy="12" r="3.5" fill="#ffffff" />
      `;
      break;

    case 'post-danger':
      // 危险/威胁警示 (警示三角与叹号)
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <polygon points="24,5 44,38 4,38" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
        <line x1="24" y1="16" x2="24" y2="26" stroke="#111827" stroke-width="4" stroke-linecap="round" />
        <circle cx="24" cy="32" r="2.5" fill="#111827" />
      `;
      break;

    case 'post-rescue':
      // 医疗救援保障 (圆角十字)
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <rect x="6" y="6" width="36" height="36" rx="8" fill="#10b981" stroke="#ffffff" stroke-width="2.5" />
        <rect x="20" y="13" width="8" height="22" fill="#ffffff" rx="2" />
        <rect x="13" y="20" width="22" height="8" fill="#ffffff" rx="2" />
      `;
      break;

    case 'post-airport':
      // 战备机场与空中兵力 (战机轮廓)
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <circle cx="24" cy="22" r="18" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
        <path d="M 24 9 L 26 18 L 36 21 L 36 24 L 26 22 L 26 29 L 30 32 L 30 34 L 24 33 L 18 34 L 18 32 L 22 29 L 22 22 L 12 24 L 12 21 L 22 18 Z" fill="#ffffff" />
      `;
      break;

    case 'post-depot':
      // 军械与物资储备库 (战备集装箱)
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <rect x="8" y="10" width="32" height="28" rx="4" fill="#8b5cf6" stroke="#ffffff" stroke-width="2" />
        <path d="M 8 19 L 40 19 M 8 28 L 40 28 M 24 10 L 24 38" stroke="#ffffff" stroke-width="2" />
      `;
      break;

    case 'marker':
      // 战术通用图钉点
      innerSvg = `
        <ellipse cx="24" cy="42" rx="8" ry="3" fill="#000000" opacity="0.3" />
        <path d="M 24 4 C 15 4 8 11 8 20 C 8 30 24 42 24 42 C 24 42 40 30 40 20 C 40 11 33 4 24 4 Z" fill="${color}" stroke="#ffffff" stroke-width="2" />
        <circle cx="24" cy="18" r="6" fill="#ffffff" />
      `;
      break;

    case 'post-target':
    default:
      // 战术十字瞄准目标
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <circle cx="24" cy="22" r="16" fill="none" stroke="${color}" stroke-width="2.5" />
        <circle cx="24" cy="22" r="8" fill="none" stroke="${color}" stroke-width="2" />
        <circle cx="24" cy="22" r="3" fill="${color}" />
        <line x1="24" y1="3" x2="24" y2="41" stroke="${color}" stroke-width="2" />
        <line x1="5" y1="22" x2="43" y2="22" stroke="${color}" stroke-width="2" />
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${innerSvg}</svg>`;

  // 使用 UTF-8 安全 Base64 编码，100% 避免 WebGL 与各浏览器编码解析差异
  try {
    if (typeof window !== 'undefined' && window.btoa) {
      const base64 = window.btoa(unescape(encodeURIComponent(svg)));
      return `data:image/svg+xml;base64,${base64}`;
    }
  } catch (e) {
    // 降级使用 encodeURIComponent
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
