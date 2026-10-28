import { PlotFeature, PlotLayer } from '../types';

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
