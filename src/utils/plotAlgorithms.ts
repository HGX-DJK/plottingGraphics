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
 */
export function calculateAttackArrow(pts: Point[]): Point[] {
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
  const arrowHeadLen = Math.min(d * 0.4, 0.12);
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
 */
export function calculatePincerArrow(pts: Point[]): Point[] {
  if (pts.length < 2) return pts;
  let pTail = pts[0];
  let pLeftTip: Point;
  let pRightTip: Point;

  if (pts.length === 2) {
    const tip = pts[1];
    const norm = getNormal(pTail, tip);
    const d = distance(pTail, tip);
    pLeftTip = addScaled(tip, norm, d * 0.32);
    pRightTip = addScaled(tip, norm, -d * 0.32);
  } else if (pts.length === 3) {
    pLeftTip = pts[1];
    pRightTip = pts[2];
  } else {
    pTail = midpoint(pts[0], pts[1]);
    pLeftTip = pts[2];
    pRightTip = pts[3];
  }

  const centerNeck = midpoint(pLeftTip, pRightTip);
  const arrow1 = calculateAttackArrow([pTail, pLeftTip]);
  const arrow2 = calculateAttackArrow([pTail, pRightTip]);

  return [...arrow1, centerNeck, ...arrow2];
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
