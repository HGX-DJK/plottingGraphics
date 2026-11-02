/**
 * 态势标绘几何与军标算法
 * 坐标格式统一为: [lng, lat] (符合 MapTalks 标准 [x, y])
 */

export type Point = [number, number]; // [lng, lat]

export function distance(p1: Point, p2: Point): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function midpoint(p1: Point, p2: Point): Point {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

/**
 * 获得由 p1 到 p2 向量的垂直法向量 (单位向量)
 */
export function getNormal(p1: Point, p2: Point): Point {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1e-6;
  return [-dy / len, dx / len];
}

export function addScaled(p: Point, vec: Point, scale: number): Point {
  return [p[0] + vec[0] * scale, p[1] + vec[1] * scale];
}

/**
 * 三次贝塞尔曲线插值
 */
export function getBezierPoints(p0: Point, p1: Point, p2: Point, p3: Point, segments = 12): Point[] {
  const points: Point[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const t1 = 1 - t;
    const lng =
      t1 * t1 * t1 * p0[0] +
      3 * t1 * t1 * t * p1[0] +
      3 * t1 * t * t * p2[0] +
      t * t * t * p3[0];
    const lat =
      t1 * t1 * t1 * p0[1] +
      3 * t1 * t1 * t * p1[1] +
      3 * t1 * t * t * p2[1] +
      t * t * t * p3[1];
    points.push([lng, lat]);
  }
  return points;
}

/**
 * 1. 直线箭头 (Straight Arrow)
 * 由2个控制点生成带箭头的带状多边形 (尾部 -> 箭尖)
 */
export function calculateStraightArrow(pts: Point[]): Point[] {
  if (pts.length < 2) return pts;
  const p1 = pts[0]; // 箭尾
  const p2 = pts[1]; // 箭尖
  const d = distance(p1, p2);
  if (d === 0) return [p1, p2];

  const arrowLen = Math.min(d * 0.35, 0.08); // 箭头头部长度
  const headWidth = arrowLen * 0.7; // 箭头展开宽度
  const bodyWidth = headWidth * 0.28; // 箭身宽度

  const norm = getNormal(p1, p2);
  const dirX = (p2[0] - p1[0]) / d;
  const dirY = (p2[1] - p1[1]) / d;

  // 箭颈基准点
  const neck: Point = [p2[0] - dirX * arrowLen, p2[1] - dirY * arrowLen];

  // 箭头左右翼
  const headL: Point = addScaled(neck, norm, headWidth);
  const headR: Point = addScaled(neck, norm, -headWidth);

  // 箭身颈部
  const neckL: Point = addScaled(neck, norm, bodyWidth);
  const neckR: Point = addScaled(neck, norm, -bodyWidth);

  // 箭身尾部
  const tailL: Point = addScaled(p1, norm, bodyWidth);
  const tailR: Point = addScaled(p1, norm, -bodyWidth);

  return [tailL, neckL, headL, p2, headR, neckR, tailR];
}

/**
 * 2. 突击/进攻箭头 (Attack Arrow)
 * 支持2或3个控制点：尾部左、尾部右、突击顶点
 *
 * @param headLenOverride 可选的箭头头部长度覆盖值（单位与坐标一致）。
 *   钳击双箭头需要按两支箭头的尖端间距自适应收缩头部，否则两个箭头头部会互相穿插，
 *   生成自相交的「蝴蝶结」几何。未传入时保持原有比例，视觉完全不变。
 */
export function calculateAttackArrow(pts: Point[], headLenOverride?: number): Point[] {
  if (pts.length < 2) return pts;
  let p1 = pts[0];
  let p2: Point;
  let tip: Point;

  if (pts.length === 2) {
    tip = pts[1];
    const d = distance(p1, tip);
    const norm = getNormal(p1, tip);
    const tailWidth = d * 0.18;
    p2 = addScaled(p1, norm, -tailWidth);
    p1 = addScaled(p1, norm, tailWidth);
  } else {
    p2 = pts[1];
    tip = pts[2];
  }

  const tailMid = midpoint(p1, p2);
  const d = distance(tailMid, tip);
  if (d === 0) return [p1, tip, p2];

  const norm = getNormal(tailMid, tip);
  const arrowHeadLen =
    headLenOverride !== undefined && headLenOverride > 0
      ? Math.min(headLenOverride, d * 0.45)
      : Math.min(d * 0.4, 0.12);
  const headWidth = arrowHeadLen * 0.8;
  const neckWidth = headWidth * 0.4;

  const dirX = (tip[0] - tailMid[0]) / d;
  const dirY = (tip[1] - tailMid[1]) / d;

  const neckCenter: Point = [tip[0] - dirX * arrowHeadLen, tip[1] - dirY * arrowHeadLen];
  const neckL = addScaled(neckCenter, norm, neckWidth);
  const neckR = addScaled(neckCenter, norm, -neckWidth);

  const headL = addScaled(neckCenter, norm, headWidth);
  const headR = addScaled(neckCenter, norm, -headWidth);

  // 曲线过渡
  const ctrl1L = addScaled(midpoint(p1, neckL), norm, neckWidth * 0.4);
  const ctrl1R = addScaled(midpoint(p2, neckR), norm, -neckWidth * 0.4);

  const leftCurve = getBezierPoints(p1, ctrl1L, ctrl1L, neckL, 6);
  const rightCurve = getBezierPoints(neckR, ctrl1R, ctrl1R, p2, 6);

  return [...leftCurve, headL, tip, headR, ...rightCurve];
}

/**
 * 3. 钳击双箭头 (Pincer / Double Arrow)
 * 双路围攻态势
 *
 * ── 历史缺陷与修复说明 ──────────────────────────────────────────────
 * 原实现直接返回 `[...arrow1, centerNeck, ...arrow2]`。
 * 但 calculateAttackArrow 返回的是一个「从尾部出发、绕一圈再回到尾部」的闭合环，
 * 而不是「从尾部射向箭头尖」的开放路径。于是拼接后的环序变成：
 *   尾左 → … → 左箭头尖 → … → 尾右 → centerNeck → 尾左 → … → 右箭头尖 → … → 尾右
 * 环在箭身中部来回折返，实测为「第 13 边与第 18 边自相交」的蝴蝶结，
 * 既无法渲染出可用的双箭头，也会被固化进 localStorage。
 *
 * 现改为按「V 形双箭头」的正确轮廓重组：
 *   尾部左缘 → 左箭头外缘 → 左箭头尖 → 凹口 → 右箭头尖 → 右箭头外缘 → 尾部右缘
 * 同时，两个箭头的头部尺寸需随两尖端间距自适应收缩（见 clampPincerHeadLen），
 * 否则尖端靠得近时两个箭头头部会互相穿插，重新形成自相交几何。
 */
export function calculatePincerArrow(pts: Point[]): Point[] {
  if (pts.length < 2) return pts;
  let pTail: Point;
  let pLeftTip: Point;
  let pRightTip: Point;

  if (pts.length === 2) {
    pTail = pts[0];
    const tip = pts[1];
    const norm = getNormal(pTail, tip);
    const d = distance(pTail, tip);
    pLeftTip = addScaled(tip, norm, d * 0.32);
    pRightTip = addScaled(tip, norm, -d * 0.32);
  } else if (pts.length === 3) {
    pTail = pts[0];
    pLeftTip = pts[1];
    pRightTip = pts[2];
  } else {
    pTail = midpoint(pts[0], pts[1]);
    pLeftTip = pts[2];
    pRightTip = pts[3];
  }

  const sep = distance(pLeftTip, pRightTip);
  const headLenLeft = clampPincerHeadLen(distance(pTail, pLeftTip), sep);
  const headLenRight = clampPincerHeadLen(distance(pTail, pRightTip), sep);

  const dirLeft = normalizedDirection(pTail, pLeftTip);
  const dirRight = normalizedDirection(pTail, pRightTip);

  /**
   * 退化守卫：两个箭头尖与尾部几乎共线时（例如用户连续点了同一直线上的三点），
   * 两支箭头的箭身会完全重叠，任何拼接方式都无法构成简单多边形。
   * 此时降级为「一支指向双尖中点的单箭头」，保证既不报错也不自相交。
   */
  const collinearity = Math.abs(crossProduct(dirLeft, dirRight));
  if (collinearity < 0.02) {
    return calculateAttackArrow([pTail, midpoint(pLeftTip, pRightTip)]);
  }

  /**
   * 凹口（两箭头之间的 V 形缺口）落在尾部与双尖中点的连线上。
   * 系数 0.55 表示缺口从尾部推进到双尖中点的 55% 处：
   * 过大（>0.7）缺口过浅、双箭头退化成实心楔形；
   * 过小（<0.35）缺口过深、整体塌成一个大「<」号。
   */
  const mid = midpoint(pLeftTip, pRightTip);
  const NOTCH_RATIO = 0.55;
  const neck: Point = [
    pTail[0] + (mid[0] - pTail[0]) * NOTCH_RATIO,
    pTail[1] + (mid[1] - pTail[1]) * NOTCH_RATIO,
  ];

  const a1 = calculateAttackArrow([pTail, pLeftTip], headLenLeft);
  const a2 = calculateAttackArrow([pTail, pRightTip], headLenRight);

  // 结构守卫：轴长退化为 0 时 calculateAttackArrow 只返回 3 个点，环序不成立
  if (a1.length < 9 || a2.length < 9) {
    return [...a1, ...a2];
  }

  /**
   * 判定每一支箭头应当保留哪一侧的外缘。
   *
   * 关键点：两支箭头的朝向不固定（用户可以先点东再点西）。
   * 若像早期实现那样固定「左箭头取左缘、右箭头取右缘」，
   * 当实际方位相反时就会取到两支箭头的内侧边，两条内侧边互相穿插，
   * 同样产生自相交几何。这里改为按几何朝向动态判定：
   *   cross(dir, 对方箭头尖 - 尾部) > 0 表示对方尖端位于法线正侧，
   *   那么该侧就是内侧、外缘在另一侧。
   */
  const rightIsOnLeftSide = crossProduct(dirLeft, [pRightTip[0] - pTail[0], pRightTip[1] - pTail[1]]) > 0;

  // a1/a2 的结构：[左缘曲线 0..6, headL 7, 箭头尖 8, headR 9, 右缘曲线 10..16]
  // slice(0,9)  = 左缘 + 外侧倒钩 + 箭头尖，方向为「尾部 → 箭头尖」
  // slice(8)    = 箭头尖 + 外侧倒钩 + 右缘，方向为「箭头尖 → 尾部」
  const leftHalf = (arr: Point[]) => arr.slice(0, 9);
  const rightHalf = (arr: Point[]) => arr.slice(8);

  // 右箭头尖端落在左箭头的法线正侧 → 左箭头的外缘在右侧，反之在左侧
  const leftArrowKeepsLeftEdge = !rightIsOnLeftSide;

  // 环序必须是「尾部 → 箭头尖 → 凹口 → 箭头尖 → 尾部」的闭环
  return leftArrowKeepsLeftEdge
    ? [...leftHalf(a1), neck, ...rightHalf(a2)]
    : [...leftHalf(a2), neck, ...rightHalf(a1)];
}

/**
 * 求两点的单位方向向量（退化时返回零向量）
 */
function normalizedDirection(from: Point, to: Point): Point {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return [0, 0];
  return [dx / len, dy / len];
}

/**
 * 二维叉积（正数表示 b 位于 a 的逆时针侧）
 */
function crossProduct(a: Point, b: Point): number {
  return a[0] * b[1] - a[1] * b[0];
}

/**
 * 钳击双箭头的单个箭头头部长度上限。
 *
 * 突击箭头默认头部占轴长 40%，两个尖端靠得近时头部必然互相穿插。
 * 这里把头部长度同时约束在「两尖端间距」之内，保证两支箭头互不干涉。
 */
function clampPincerHeadLen(shaftLen: number, tipSep: number): number {
  const natural = Math.min(shaftLen * 0.4, 0.12);
  const limited = Math.min(natural, tipSep * 0.42);
  return Math.max(limited, 1e-5);
}

/**
 * 4. 集结地域 (Gathering Place)
 * 3点或多点平滑封闭多边形
 */
export function calculateGatheringPlace(pts: Point[]): Point[] {
  if (pts.length < 3) return pts;
  const n = pts.length;
  const result: Point[] = [];

  for (let i = 0; i < n; i++) {
    const pCurr = pts[i];
    const pNext = pts[(i + 1) % n];
    const pNext2 = pts[(i + 2) % n];

    const mid1 = midpoint(pCurr, pNext);
    const mid2 = midpoint(pNext, pNext2);

    const curve = getBezierPoints(mid1, pNext, pNext, mid2, 6);
    result.push(...curve);
  }

  return result;
}

/**
 * 5. 防御警戒扇形 (Sector)
 */
export function calculateSector(center: Point, edgePoint: Point, angleDeg = 90): Point[] {
  const r = distance(center, edgePoint);
  if (r === 0) return [center];

  const mainAngle = Math.atan2(edgePoint[1] - center[1], edgePoint[0] - center[0]);
  const halfAngleRad = ((angleDeg / 2) * Math.PI) / 180;
  const startAngle = mainAngle - halfAngleRad;
  const endAngle = mainAngle + halfAngleRad;

  const points: Point[] = [center];
  const segments = 24;
  for (let i = 0; i <= segments; i++) {
    const th = startAngle + (i / segments) * (endAngle - startAngle);
    points.push([center[0] + r * Math.cos(th), center[1] + r * Math.sin(th)]);
  }
  points.push(center);
  return points;
}
