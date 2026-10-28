/**
 * GIS 专业标号与通用地物图符生成器
 * 生成符合通用 GIS 规范、跨平台 100% 兼容的 SVG Base64 Data URI
 */

export function createTacticalIcon(type: string, color = '#3b82f6', text = ''): string {
  let innerSvg = '';

  switch (type) {
    // 1. 通用外业调查与控制测量点 (十字准星与基准控制标)
    case 'point-survey':
      innerSvg = `
        <ellipse cx="24" cy="42" rx="12" ry="4" fill="#000000" opacity="0.3" />
        <circle cx="24" cy="22" r="16" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2.5" />
        <circle cx="24" cy="22" r="8" fill="#ffffff" stroke="${color}" stroke-width="2" />
        <circle cx="24" cy="22" r="3" fill="${color}" />
        <line x1="24" y1="4" x2="24" y2="40" stroke="${color}" stroke-width="1.8" stroke-dasharray="2,2" />
        <line x1="6" y1="22" x2="42" y2="22" stroke="${color}" stroke-width="1.8" stroke-dasharray="2,2" />
      `;
      break;

    // 2. 环境 / 气象 / 水文监测站 (监测铁塔与无线传感波)
    case 'point-station':
    case 'post-radar':
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <circle cx="24" cy="22" r="18" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2" />
        <path d="M 12 34 A 14 14 0 0 1 36 34" fill="none" stroke="#ffffff" stroke-width="2.5" />
        <path d="M 17 34 A 8 8 0 0 1 31 34" fill="none" stroke="#ffffff" stroke-width="2" />
        <line x1="24" y1="34" x2="24" y2="12" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="24" cy="12" r="3.5" fill="#ffffff" />
      `;
      break;

    // 3. 市政基础设施与公共服务 (建筑地物)
    case 'point-facility':
    case 'post-command':
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <rect x="8" y="10" width="32" height="28" rx="4" fill="${color}" stroke="#ffffff" stroke-width="2.2" />
        <polygon points="24,4 42,12 6,12" fill="${color}" stroke="#ffffff" stroke-width="2" />
        <rect x="13" y="18" width="6" height="6" fill="#ffffff" rx="1" />
        <rect x="29" y="18" width="6" height="6" fill="#ffffff" rx="1" />
        <rect x="20" y="27" width="8" height="11" fill="#ffffff" rx="1" />
      `;
      break;

    // 4. 地质隐患 / 生态风险警示点 (警示三角标)
    case 'point-hazard':
    case 'post-danger':
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <polygon points="24,5 44,38 4,38" fill="#f59e0b" stroke="#ffffff" stroke-width="2.2" />
        <line x1="24" y1="16" x2="24" y2="26" stroke="#111827" stroke-width="4" stroke-linecap="round" />
        <circle cx="24" cy="32" r="2.5" fill="#111827" />
      `;
      break;

    // 5. 应急医疗 / 避难救助点 (绿色十字盾徽)
    case 'point-medical':
    case 'post-rescue':
      innerSvg = `
        <ellipse cx="24" cy="42" rx="14" ry="4" fill="#000000" opacity="0.3" />
        <rect x="6" y="6" width="36" height="36" rx="8" fill="#10b981" stroke="#ffffff" stroke-width="2.5" />
        <rect x="20" y="13" width="8" height="22" fill="#ffffff" rx="2" />
        <rect x="13" y="20" width="22" height="8" fill="#ffffff" rx="2" />
      `;
      break;

    // 6. 通用 GIS 定位图钉 (标准高分辨率 Pin)
    case 'marker':
    default:
      innerSvg = `
        <ellipse cx="24" cy="42" rx="8" ry="3.5" fill="#000000" opacity="0.3" />
        <path d="M 24 4 C 15 4 8 11 8 20 C 8 30 24 42 24 42 C 24 42 40 30 40 20 C 40 11 33 4 24 4 Z" fill="${color}" stroke="#ffffff" stroke-width="2" />
        <circle cx="24" cy="18" r="6" fill="#ffffff" />
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${innerSvg}</svg>`;

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
