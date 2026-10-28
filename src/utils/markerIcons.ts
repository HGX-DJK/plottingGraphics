/**
 * 战术标号与图标生成器 (生成高清 SVG Data URI)
 */

export function createTacticalIcon(type: string, color = '#ef4444', text = ''): string {
  let innerSvg = '';

  switch (type) {
    case 'post-command':
      // 军事指挥所图标 (五角星与指挥旗)
      innerSvg = `
        <polygon points="24,6 40,38 8,38" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
        <polygon points="24,15 26.5,22 34,22 28,26.5 30,34 24,29.5 18,34 20,26.5 14,22 21.5,22" fill="#ffffff" />
      `;
      break;

    case 'post-radar':
      // 预警雷达阵地 (雷达天线与同心扫描波)
      innerSvg = `
        <circle cx="24" cy="24" r="18" fill="${color}" fill-opacity="0.25" stroke="${color}" stroke-width="2" />
        <path d="M 12 36 A 16 16 0 0 1 36 36" fill="none" stroke="#ffffff" stroke-width="2.5" />
        <path d="M 17 36 A 9 9 0 0 1 31 36" fill="none" stroke="#ffffff" stroke-width="2" />
        <line x1="24" y1="36" x2="24" y2="12" stroke="#ffffff" stroke-width="2.5" />
        <circle cx="24" cy="12" r="3.5" fill="#ffffff" />
      `;
      break;

    case 'post-danger':
      // 危险/威胁警示 (警示三角形与叹号)
      innerSvg = `
        <polygon points="24,5 44,40 4,40" fill="#f59e0b" stroke="#ffffff" stroke-width="2" />
        <line x1="24" y1="18" x2="24" y2="28" stroke="#111827" stroke-width="4" stroke-linecap="round" />
        <circle cx="24" cy="34" r="2.5" fill="#111827" />
      `;
      break;

    case 'post-rescue':
      // 医疗救援点 (医疗红十字)
      innerSvg = `
        <rect x="5" y="5" width="38" height="38" rx="8" fill="#10b981" stroke="#ffffff" stroke-width="2.5" />
        <rect x="20" y="12" width="8" height="24" fill="#ffffff" rx="2" />
        <rect x="12" y="20" width="24" height="8" fill="#ffffff" rx="2" />
      `;
      break;

    case 'post-airport':
      // 机场与空中战术力量
      innerSvg = `
        <circle cx="24" cy="24" r="19" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
        <path d="M 24 10 L 26 19 L 37 23 L 37 26 L 26 24 L 26 31 L 30 34 L 30 36 L 24 35 L 18 36 L 18 34 L 22 31 L 22 24 L 11 26 L 11 23 L 22 19 Z" fill="#ffffff" />
      `;
      break;

    case 'post-depot':
      // 军备物资仓库
      innerSvg = `
        <rect x="8" y="10" width="32" height="28" rx="4" fill="#8b5cf6" stroke="#ffffff" stroke-width="2" />
        <path d="M 8 18 L 40 18 M 8 28 L 40 28 M 24 10 L 24 38" stroke="#ffffff" stroke-width="2" />
      `;
      break;

    case 'post-target':
    default:
      // 战术十字瞄准目标
      innerSvg = `
        <circle cx="24" cy="24" r="16" fill="none" stroke="${color}" stroke-width="2.5" />
        <circle cx="24" cy="24" r="8" fill="none" stroke="${color}" stroke-width="2" />
        <circle cx="24" cy="24" r="3" fill="${color}" />
        <line x1="24" y1="4" x2="24" y2="44" stroke="${color}" stroke-width="2" />
        <line x1="4" y1="24" x2="44" y2="24" stroke="${color}" stroke-width="2" />
      `;
      break;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.6"/>
    </filter>
    <g filter="url(#shadow)">
      ${innerSvg}
    </g>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
