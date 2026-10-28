import { PlotFeature, PlotLayer } from '../types';

/**
 * 坐标格式枚举
 */
export type CoordinateFormat = 'DD' | 'DMS' | 'MERCATOR';

/**
 * 将经纬度转换为度分秒 (DMS) 字符串
 */
export function toDMS(val: number, isLng: boolean): string {
  const dir = isLng ? (val >= 0 ? 'E' : 'W') : (val >= 0 ? 'N' : 'S');
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(1);
  return `${deg}°${min.toString().padStart(2, '0')}'${sec.padStart(4, '0')}" ${dir}`;
}

/**
 * 将经纬度转换为 Web 墨卡托投影米制坐标 (EPSG:3857)
 */
export function toWebMercator(lng: number, lat: number): [number, number] {
  const R = 6378137;
  const x = R * ((lng * Math.PI) / 180);
  const latClamped = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const latRad = (latClamped * Math.PI) / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  return [Math.round(x), Math.round(y)];
}

/**
 * 多格式坐标格式化展示
 */
export function formatCoordinates(coords: [number, number], format: CoordinateFormat): string {
  const [lng, lat] = coords;
  if (format === 'DMS') {
    return `${toDMS(lng, true)}, ${toDMS(lat, false)}`;
  }
  if (format === 'MERCATOR') {
    const [x, y] = toWebMercator(lng, lat);
    return `X: ${x.toLocaleString()} m, Y: ${y.toLocaleString()} m`;
  }
  // 默认 DD (十进制度)
  return `${lng.toFixed(6)}° E, ${lat.toFixed(6)}° N`;
}

/**
 * 计算两点间的真北方位角 (Azimuth / Bearing)
 * 返回 [0, 360) 角度与工程测量方位描述 (如 北偏东 45.2°)
 */
export function calculateAzimuth(
  p1: [number, number],
  p2: [number, number]
): {
  degrees: number;
  text: string;
  quadrant: string;
} {
  const [lng1, lat1] = p1;
  const [lng2, lat2] = p2;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLam = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(deltaLam) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLam);
  const theta = Math.atan2(y, x);
  const brng = ((theta * 180) / Math.PI + 360) % 360;

  let quadrant = '';
  let directionDesc = '';
  if (brng >= 337.5 || brng < 22.5) {
    quadrant = 'N';
    directionDesc = '正北';
  } else if (brng >= 22.5 && brng < 67.5) {
    quadrant = 'NE';
    directionDesc = `北偏东 ${brng.toFixed(1)}°`;
  } else if (brng >= 67.5 && brng < 112.5) {
    quadrant = 'E';
    directionDesc = '正东';
  } else if (brng >= 112.5 && brng < 157.5) {
    quadrant = 'SE';
    directionDesc = `南偏东 ${(180 - brng).toFixed(1)}°`;
  } else if (brng >= 157.5 && brng < 202.5) {
    quadrant = 'S';
    directionDesc = '正南';
  } else if (brng >= 202.5 && brng < 247.5) {
    quadrant = 'SW';
    directionDesc = `南偏西 ${(brng - 180).toFixed(1)}°`;
  } else if (brng >= 247.5 && brng < 292.5) {
    quadrant = 'W';
    directionDesc = '正西';
  } else {
    quadrant = 'NW';
    directionDesc = `北偏西 ${(360 - brng).toFixed(1)}°`;
  }

  return {
    degrees: parseFloat(brng.toFixed(1)),
    text: `${brng.toFixed(1)}° (${directionDesc})`,
    quadrant,
  };
}

/**
 * 拓扑顶点吸附查找 (Smart Snapping)
 */
export interface SnapResult {
  snapped: boolean;
  snappedCoord: [number, number];
  distanceMeters: number;
}

export function findSnapTarget(
  coord: [number, number],
  candidateCoords: [number, number][],
  thresholdMeters: number
): SnapResult {
  if (!candidateCoords || candidateCoords.length === 0) {
    return { snapped: false, snappedCoord: coord, distanceMeters: Infinity };
  }

  let closest: [number, number] = coord;
  let minDistance = Infinity;

  for (let i = 0; i < candidateCoords.length; i++) {
    const cand = candidateCoords[i];
    const dist = calculateSphericalDistance(coord, cand);
    if (dist < minDistance) {
      minDistance = dist;
      closest = cand;
    }
  }

  if (minDistance <= thresholdMeters) {
    return {
      snapped: true,
      snappedCoord: closest,
      distanceMeters: minDistance,
    };
  }

  return {
    snapped: false,
    snappedCoord: coord,
    distanceMeters: minDistance,
  };
}

/**
 * 二维线段自相交拓扑检验
 */
function ccw(p1: [number, number], p2: [number, number], p3: [number, number]): number {
  return (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
}

function segmentsIntersect(
  a1: [number, number],
  a2: [number, number],
  b1: [number, number],
  b2: [number, number]
): boolean {
  if (
    Math.max(a1[0], a2[0]) < Math.min(b1[0], b2[0]) ||
    Math.max(b1[0], b2[0]) < Math.min(a1[0], a2[0]) ||
    Math.max(a1[1], a2[1]) < Math.min(b1[1], b2[1]) ||
    Math.max(b1[1], b2[1]) < Math.min(a1[1], a2[1])
  ) {
    return false;
  }

  const d1 = ccw(b1, b2, a1);
  const d2 = ccw(b1, b2, a2);
  const d3 = ccw(a1, a2, b1);
  const d4 = ccw(a1, a2, b2);

  return (
    ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))
  );
}

/**
 * 校验多边形是否存在边线自相交 (OGC 规范拓扑有效性)
 */
export function checkPolygonSelfIntersection(ring: [number, number][]): {
  hasIntersection: boolean;
  message?: string;
} {
  if (ring.length < 4) return { hasIntersection: false };
  const n = ring.length;

  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const p1 = ring[i];
      const p2 = ring[i + 1];
      const p3 = ring[j];
      const p4 = ring[(j + 1) % n];
      if (segmentsIntersect(p1, p2, p3, p4)) {
        return {
          hasIntersection: true,
          message: `第 ${i + 1} 边与第 ${j + 1} 边存在自相交交叉，违反 OGC 拓扑规范`,
        };
      }
    }
  }
  return { hasIntersection: false };
}

/**
 * 计算两点间球面大圆距离 (米)
 * p1, p2 为 [lng, lat]
 */
export function calculateSphericalDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6378137; // 地球 WGS84 半径 (米)
  const dLat = ((p2[1] - p1[1]) * Math.PI) / 180;
  const dLng = ((p2[0] - p1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[1] * Math.PI) / 180) *
      Math.cos((p2[1] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 计算折线总长度 (米)
 */
export function calculateLineLength(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateSphericalDistance(coords[i], coords[i + 1]);
  }
  return total;
}

/**
 * 计算球面多边形面积 (平方米)
 * 基于球面多边形面积积分算法 (GIS 标准算法)
 */
export function calculateSphericalPolygonArea(coords: [number, number][]): number {
  if (coords.length < 3) return 0;
  const R = 6378137;
  let total = 0;
  const n = coords.length;

  for (let i = 0; i < n; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % n];

    const lng1 = (p1[0] * Math.PI) / 180;
    const lat1 = (p1[1] * Math.PI) / 180;
    const lng2 = (p2[0] * Math.PI) / 180;
    const lat2 = (p2[1] * Math.PI) / 180;

    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const area = Math.abs((total * R * R) / 2);
  return area;
}

/**
 * 格式化距离长度显示
 */
export function formatDistance(meters: number): string {
  if (!meters || isNaN(meters)) return '0 m';
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * 格式化空间面积显示 (平方米 / 平方公里 / 亩)
 */
export function formatArea(sqMeters: number): string {
  if (!sqMeters || isNaN(sqMeters)) return '0 m²';
  const mu = (sqMeters * 0.0015).toFixed(1); // 换算为中国常用亩
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km² (${mu} 亩)`;
  }
  return `${Math.round(sqMeters).toLocaleString()} m² (${mu} 亩)`;
}

/**
 * 导出标绘工程为 JSON 格式
 */
export function exportPlottingProject(layers: PlotLayer[], features: PlotFeature[]): string {
  const data = {
    version: '1.2.0',
    type: 'GeoPlotProject',
    spatialReference: 'EPSG:4326',
    timestamp: new Date().toISOString(),
    layers,
    features,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 导出要素为标准 RFC 7946 GeoJSON 格式 (供 QGIS, ArcGIS, Mapbox, Leaflet 等通用 GIS 软件读取)
 */
export function exportToGeoJSON(features: PlotFeature[]): string {
  const geojson = {
    type: 'FeatureCollection',
    name: 'GeoPlot_Export_Features',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features: features.map((f) => {
      let geometryType = 'Point';
      let coords: any = f.coordinates;

      if (f.type === 'marker' || f.type.startsWith('point-') || f.type === 'text') {
        geometryType = 'Point';
        coords = f.coordinates[0] || [0, 0];
      } else if (f.type === 'polyline' || f.type === 'freehand') {
        geometryType = 'LineString';
        coords = f.coordinates;
      } else {
        geometryType = 'Polygon';
        const ring = [...f.coordinates];
        if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
          ring.push(ring[0]);
        }
        coords = [ring];
      }

      return {
        type: 'Feature',
        id: f.id,
        properties: {
          name: f.name,
          type: f.type,
          layerId: f.layerId,
          ...f.properties,
        },
        geometry: {
          type: geometryType,
          coordinates: coords,
        },
      };
    }),
  };

  return JSON.stringify(geojson, null, 2);
}

/**
 * 触发文件下载
 */
export function downloadFile(filename: string, content: string, contentType = 'application/json') {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
