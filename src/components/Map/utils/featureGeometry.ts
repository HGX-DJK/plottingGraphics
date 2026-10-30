import { PlotFeature } from '../../../types';
import {
  calculateStraightArrow,
  calculateAttackArrow,
  calculatePincerArrow,
  calculateGatheringPlace,
  calculateSector,
} from '../../../utils/plotAlgorithms';
import { createTacticalIcon } from '../../../utils/markerIcons';

/**
 * 辅助函数：根据要素定义构造 MapTalks Geometry 实例
 */
export function createGeometryFromFeature(
  maptalks: any,
  feat: PlotFeature,
  isSelected: boolean
) {
  const { type, coordinates, properties } = feat;
  if (!coordinates || coordinates.length === 0) return null;

  const strokeColor = isSelected ? '#fbbf24' : properties.strokeColor;
  const strokeWidth = isSelected ? properties.strokeWidth + 2 : properties.strokeWidth;
  const dash = properties.strokeDasharray === 'dash' ? [8, 6] : null;

  // 专题地物点与调查标号
  if (type.startsWith('post-') || type.startsWith('point-')) {
    const iconUrl = createTacticalIcon(type, properties.strokeColor, properties.text);
    return new maptalks.Marker(coordinates[0], {
      id: feat.id,
      symbol: [
        {
          markerFile: iconUrl,
          markerWidth: isSelected ? 46 : 38,
          markerHeight: isSelected ? 46 : 38,
          markerDx: 0,
          markerDy: 0,
        },
        {
          textName: properties.text || feat.name,
          textSize: properties.textSize || 12,
          textFill: isSelected ? '#fbbf24' : properties.textColor || '#ffffff',
          textHaloFill: '#0b1120',
          textHaloRadius: 3,
          textDy: 26,
          textWeight: 'bold',
        },
      ],
    });
  }

  // 普通点标记
  if (type === 'marker') {
    const iconUrl = createTacticalIcon('marker', strokeColor, feat.name);
    return new maptalks.Marker(coordinates[0], {
      id: feat.id,
      symbol: [
        {
          markerFile: iconUrl,
          markerWidth: isSelected ? 40 : 32,
          markerHeight: isSelected ? 40 : 32,
          markerDx: 0,
          markerDy: -6,
        },
        {
          textName: feat.name,
          textSize: 12,
          textFill: isSelected ? '#fbbf24' : '#ffffff',
          textHaloFill: '#000000',
          textHaloRadius: 2,
          textDy: 20,
        },
      ],
    });
  }

  // 纯文字注记
  if (type === 'text') {
    return new maptalks.Marker(coordinates[0], {
      id: feat.id,
      symbol: {
        textName: properties.text || feat.name,
        textSize: properties.textSize || 14,
        textFill: isSelected ? '#fbbf24' : properties.textColor || '#38bdf8',
        textHaloFill: '#0f172a',
        textHaloRadius: 3,
        textWeight: 'bold',
      },
    });
  }

  // 折线 / 路线 / 自由手绘
  if (type === 'polyline' || type === 'freehand') {
    return new maptalks.LineString(coordinates, {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        lineDasharray: dash,
        lineOpacity: 0.95,
      },
    });
  }

  // 圆形
  if (type === 'circle') {
    const radius = properties.radius || 1200;
    return new maptalks.Circle(coordinates[0], radius, {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        lineDasharray: dash,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 矩形 (根据2个对角点或4个顶点生成)
  if (type === 'rectangle') {
    let rectCoords = coordinates;
    if (coordinates.length === 2) {
      const [p1, p2] = coordinates;
      rectCoords = [
        [p1[0], p1[1]],
        [p2[0], p1[1]],
        [p2[0], p2[1]],
        [p1[0], p2[1]],
      ];
    }
    if (rectCoords.length < 3) return null;
    return new maptalks.Polygon([rectCoords], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        lineDasharray: dash,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 普通多边形
  if (type === 'polygon') {
    if (coordinates.length < 3) return null;
    return new maptalks.Polygon([coordinates], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        lineDasharray: dash,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 战术军标：直箭头
  if (type === 'straight-arrow') {
    const arrowCoords = calculateStraightArrow(coordinates);
    if (arrowCoords.length < 3) return null;
    return new maptalks.Polygon([arrowCoords], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 战术军标：突击箭头
  if (type === 'attack-arrow') {
    const arrowCoords = calculateAttackArrow(coordinates);
    if (arrowCoords.length < 3) return null;
    return new maptalks.Polygon([arrowCoords], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 战术军标：钳击双箭头
  if (type === 'pincer-arrow') {
    const pincerCoords = calculatePincerArrow(coordinates);
    if (pincerCoords.length < 3) return null;
    return new maptalks.Polygon([pincerCoords], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 战术态势：集结地域
  if (type === 'gathering-place') {
    const gatherCoords = calculateGatheringPlace(coordinates);
    if (gatherCoords.length < 3) return null;
    return new maptalks.Polygon([gatherCoords], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  // 战术态势：防御警戒扇形
  if (type === 'sector') {
    const center = coordinates[0];
    const edge = coordinates[1] || [center[0] + 0.05, center[1]];
    const sectorCoords = calculateSector(center, edge, 90);
    if (sectorCoords.length < 3) return null;
    return new maptalks.Polygon([sectorCoords], {
      id: feat.id,
      symbol: {
        lineColor: strokeColor,
        lineWidth: strokeWidth,
        lineDasharray: dash,
        polygonFill: properties.fillColor,
        polygonOpacity: properties.fillOpacity,
      },
    });
  }

  return null;
}

/**
 * 计算要素的外包框与中心坐标
 */
export function calculateFeatureBoundsAndCenter(feat: PlotFeature): {
  center: [number, number];
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  spanLng: number;
  spanLat: number;
  isSinglePoint: boolean;
} | null {
  if (!feat || !feat.coordinates || feat.coordinates.length === 0) return null;

  let minLng = Infinity,
    maxLng = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  let sumLng = 0,
    sumLat = 0;

  feat.coordinates.forEach(([lng, lat]) => {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    sumLng += lng;
    sumLat += lat;
  });

  const count = feat.coordinates.length;
  const center: [number, number] = [sumLng / count, sumLat / count];
  const spanLng = maxLng - minLng;
  const spanLat = maxLat - minLat;

  return {
    center,
    bounds: { minLng, maxLng, minLat, maxLat },
    spanLng,
    spanLat,
    isSinglePoint: count === 1,
  };
}

/**
 * 计算要素聚焦时的适宜地图缩放层级
 */
export function calculateTargetZoom(
  spanLng: number,
  spanLat: number,
  isSinglePoint: boolean,
  currentZoom: number
): number {
  if (isSinglePoint) {
    return Math.max(currentZoom, 16);
  }
  if (spanLng > 0.08 || spanLat > 0.08) {
    return 13.5;
  }
  if (spanLng > 0.03 || spanLat > 0.03) {
    return 14.5;
  }
  return Math.max(currentZoom, 15.5);
}
