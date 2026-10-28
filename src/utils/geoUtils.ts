import { PlotFeature, PlotLayer } from '../types';

/**
 * 计算两点间球面大圆距离 (米)
 * p1, p2 为 [lng, lat]
 */
export function calculateSphericalDistance(p1: [number, number], p2: [number, number]): number {
  const R = 6378137; // 地球半径 (米)
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
 * 格式化距离显示
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/**
 * 格式化面积显示
 */
export function formatArea(sqMeters: number): string {
  if (sqMeters >= 1000000) {
    return `${(sqMeters / 1000000).toFixed(2)} km²`;
  }
  return `${Math.round(sqMeters)} m²`;
}

/**
 * 导出标绘数据为 JSON 格式
 */
export function exportPlottingProject(layers: PlotLayer[], features: PlotFeature[]): string {
  const data = {
    version: '1.0.0',
    type: 'GeoPlotStudioData',
    timestamp: new Date().toISOString(),
    layers,
    features,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * 导出要素为标准 GeoJSON 格式
 */
export function exportToGeoJSON(features: PlotFeature[]): string {
  const geojson = {
    type: 'FeatureCollection',
    features: features.map((f) => {
      let geometryType = 'Point';
      let coords: any = f.coordinates;

      if (f.type === 'marker' || f.type.startsWith('post-') || f.type === 'text') {
        geometryType = 'Point';
        coords = f.coordinates[0] || [0, 0];
      } else if (f.type === 'polyline' || f.type === 'freehand') {
        geometryType = 'LineString';
        coords = f.coordinates;
      } else {
        geometryType = 'Polygon';
        // 闭合多边形
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
