import { useState, useRef, useEffect, useCallback } from 'react';
import { PlotFeature, PlotFeatureType, PlotLayer } from '../../../types';
import {
  calculateSphericalDistance,
  formatDistance,
  calculateSphericalPolygonArea,
  calculateLineLength,
  calculateAzimuth,
  findSnapTarget,
  checkPolygonSelfIntersection,
} from '../../../utils/geoUtils';
import {
  calculateStraightArrow,
  calculateAttackArrow,
  calculatePincerArrow,
  calculateGatheringPlace,
  calculateSector,
} from '../../../utils/plotAlgorithms';

interface UsePlotDrawingOptions {
  mapInstanceRef: React.MutableRefObject<any>;
  previewLayerRef: React.MutableRefObject<any>;
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  activeLayerIdRef: React.MutableRefObject<string>;
  layersRef: React.MutableRefObject<PlotLayer[]>;
  featuresRef: React.MutableRefObject<PlotFeature[]>;
  enableSnappingRef: React.MutableRefObject<boolean>;
  onCreateFeature: (featureData: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancelDrawing: () => void;
  onDrawingPointsChange?: (count: number) => void;
  onTopologyWarning?: (msg: string | null) => void;
  onActiveSegmentChange?: (segment: { length: number; azimuth: { degrees: number; text: string } } | null) => void;
  onSnapFeedback?: (snapped: boolean) => void;
}

export function usePlotDrawing({
  mapInstanceRef,
  previewLayerRef,
  drawingTool,
  activeLayerIdRef,
  layersRef,
  featuresRef,
  enableSnappingRef,
  onCreateFeature,
  onCancelDrawing,
  onDrawingPointsChange,
  onTopologyWarning,
  onActiveSegmentChange,
  onSnapFeedback,
}: UsePlotDrawingOptions) {
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const drawingPointsRef = useRef<[number, number][]>([]);
  drawingPointsRef.current = drawingPoints;

  const onCreateFeatureRef = useRef(onCreateFeature);
  onCreateFeatureRef.current = onCreateFeature;

  const onCancelDrawingRef = useRef(onCancelDrawing);
  onCancelDrawingRef.current = onCancelDrawing;

  const onTopologyWarningRef = useRef(onTopologyWarning);
  onTopologyWarningRef.current = onTopologyWarning;

  const onActiveSegmentChangeRef = useRef(onActiveSegmentChange);
  onActiveSegmentChangeRef.current = onActiveSegmentChange;

  const onSnapFeedbackRef = useRef(onSnapFeedback);
  onSnapFeedbackRef.current = onSnapFeedback;

  const isMeasureTool =
    drawingTool === 'measure-distance' || drawingTool === 'measure-area';

  // 向上汇报当前打点数量 (仅非量算时由本 Hook 汇报)
  useEffect(() => {
    if (!isMeasureTool) {
      onDrawingPointsChange?.(drawingPoints.length);
    }
  }, [isMeasureTool, drawingPoints.length, onDrawingPointsChange]);

  // 吸附候选顶点计算
  const getCandidateVertices = useCallback((): [number, number][] => {
    const currentLayers = layersRef.current;
    const currentFeatures = featuresRef.current;
    const visibleLayerIds = new Set(currentLayers.filter((l) => l.visible).map((l) => l.id));
    const candidates: [number, number][] = [];
    currentFeatures.forEach((feat) => {
      if (visibleLayerIds.has(feat.layerId) && feat.coordinates) {
        feat.coordinates.forEach((c) => candidates.push(c));
      }
    });
    drawingPointsRef.current.forEach((c) => candidates.push(c));
    return candidates;
  }, [layersRef, featuresRef]);

  // 完成标绘并落库
  const finishDrawing = useCallback(
    (pts: [number, number][]) => {
      if (!drawingTool || isMeasureTool || pts.length === 0) return;
      previewLayerRef.current?.clear();

      const currentActiveId = activeLayerIdRef.current;
      const currentLayers = layersRef.current;
      const activeLayer = currentLayers.find((l) => l.id === currentActiveId) || currentLayers[0];
      const targetLayerId = activeLayer?.id || currentActiveId;
      const themeColor = activeLayer?.color || '#3b82f6';

      const defaultNames: Record<string, string> = {
        'straight-arrow': '规划方向直箭头',
        'attack-arrow': '空间发展推进轴',
        'pincer-arrow': '双向分流与汇聚标绘',
        'gathering-place': '重点管控集结地域',
        'sector': '探测覆盖扇形区',
        'polyline': '道路廊道/勘界折线',
        'polygon': '规划控制地块面',
        'rectangle': '标准搜索网格(BBox)',
        'circle': '缓冲区安全半径圈',
        'marker': '空间地理标定点',
        'text': '空间地物文字注记',
        'freehand': '实地踏勘手绘轨迹',
        'point-survey': '外业控制测量点',
        'point-station': '生态环境监测站',
        'point-facility': '市政基础设施点',
        'point-hazard': '灾害风险隐患点',
        'point-medical': '应急医疗避难点',
        'post-command': '综合指挥调度中心',
        'post-radar': '雷达探测基准站',
        'post-danger': '重点危险源警示',
        'post-rescue': '应急物资救助站',
        'post-airport': '交通枢纽起降场',
        'post-depot': '物资储备调配库',
      };

      let calcArea: number | undefined = undefined;
      let calcLength: number | undefined = undefined;

      if (drawingTool === 'polygon' && pts.length >= 3) {
        calcArea = calculateSphericalPolygonArea(pts);
        calcLength = calculateLineLength([...pts, pts[0]]);
      } else if (drawingTool === 'rectangle' && pts.length >= 2) {
        const [p1, p2] = pts;
        const rectCoords: [number, number][] = [
          [p1[0], p1[1]],
          [p2[0], p1[1]],
          [p2[0], p2[1]],
          [p1[0], p2[1]],
        ];
        calcArea = calculateSphericalPolygonArea(rectCoords);
        calcLength = calculateLineLength([...rectCoords, rectCoords[0]]);
      } else if (drawingTool === 'circle') {
        const r = pts.length >= 2 ? calculateSphericalDistance(pts[0], pts[1]) : 1200;
        calcArea = Math.PI * r * r;
        calcLength = 2 * Math.PI * r;
      } else if (drawingTool === 'polyline' || drawingTool === 'freehand') {
        calcLength = calculateLineLength(pts);
      }

      const newFeature: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'> = {
        name: `${defaultNames[drawingTool] || '标绘要素'}_${Date.now().toString().slice(-4)}`,
        type: drawingTool as PlotFeatureType,
        layerId: targetLayerId,
        coordinates: pts,
        properties: {
          strokeColor: themeColor,
          strokeWidth: 3,
          strokeDasharray: 'solid',
          fillColor: themeColor,
          fillOpacity:
            drawingTool.includes('arrow') ||
            drawingTool.includes('poly') ||
            drawingTool === 'gathering-place' ||
            drawingTool === 'rectangle'
              ? 0.35
              : 0.2,
          text: defaultNames[drawingTool] || '',
          textColor: '#ffffff',
          textSize: 13,
          radius:
            drawingTool === 'circle' && pts.length >= 2
              ? Math.round(calculateSphericalDistance(pts[0], pts[1]))
              : 1200,
          calculatedArea: calcArea,
          calculatedLength: calcLength,
        },
      };

      onCreateFeatureRef.current(newFeature);
      setDrawingPoints([]);
      onTopologyWarningRef.current?.(null);
      onActiveSegmentChangeRef.current?.(null);
      onCancelDrawingRef.current();
    },
    [drawingTool, isMeasureTool, previewLayerRef, activeLayerIdRef, layersRef]
  );

  // 渲染半透明预览
  const renderPreview = useCallback(
    (pts: [number, number][], snappedCoord?: [number, number]) => {
      const previewLayer = previewLayerRef.current;
      if (!previewLayer || typeof window === 'undefined' || !(window as any).maptalks || !drawingTool) return;
      const maptalks = (window as any).maptalks;

      previewLayer.clear();
      if (pts.length === 0) return;

      let hasTopoError = false;
      if (drawingTool === 'polygon' && pts.length >= 4) {
        const topo = checkPolygonSelfIntersection(pts);
        if (topo.hasIntersection) {
          hasTopoError = true;
          onTopologyWarningRef.current?.(topo.message || '⚠️ 存在边线自相交 (不符合GIS拓扑规范)');
        } else {
          onTopologyWarningRef.current?.(null);
        }
      } else {
        onTopologyWarningRef.current?.(null);
      }

      const symbol = {
        lineColor: hasTopoError ? '#ef4444' : '#f59e0b',
        lineWidth: hasTopoError ? 3 : 2.5,
        lineDasharray: hasTopoError ? [4, 4] : [6, 4],
        polygonFill: hasTopoError ? '#ef4444' : '#f59e0b',
        polygonOpacity: hasTopoError ? 0.35 : 0.28,
      };

      // 1. 在每个已采集的控制顶点处绘制醒目的序号标定圆点
      pts.forEach((pt, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pts.length - 1;
        const isPolygonReadyToClose = isFirst && drawingTool === 'polygon' && pts.length >= 3;
        const vertexMarker = new maptalks.Marker(pt, {
          symbol: [
            {
              markerType: 'ellipse',
              markerWidth: isPolygonReadyToClose ? 20 : isFirst ? 18 : 14,
              markerHeight: isPolygonReadyToClose ? 20 : isFirst ? 18 : 14,
              markerFill: isPolygonReadyToClose ? '#10b981' : isFirst ? '#059669' : isLast ? '#3b82f6' : '#f59e0b',
              markerLineColor: '#ffffff',
              markerLineWidth: isPolygonReadyToClose ? 2.5 : 2,
              markerFillOpacity: 0.95,
            },
            {
              textName: isPolygonReadyToClose ? '点此闭合' : isFirst ? '起点' : `#${idx + 1}`,
              textSize: 10,
              textFill: '#ffffff',
              textHaloFill: '#0b1120',
              textHaloRadius: 2.5,
              textDy: -15,
              textWeight: 'bold',
            },
          ],
        });
        if (isPolygonReadyToClose) {
          vertexMarker.on('click tap', (ev: any) => {
            if (ev.domEvent) ev.domEvent.stopPropagation();
            const currentPoints = drawingPointsRef.current;
            if (currentPoints.length >= 3) {
              finishDrawing(currentPoints);
            }
          });
        }
        previewLayer.addGeometry(vertexMarker);
      });

      // 2. 磁吸吸附光圈标定反馈
      if (snappedCoord) {
        const snapMarker = new maptalks.Marker(snappedCoord, {
          symbol: [
            {
              markerType: 'ellipse',
              markerWidth: 26,
              markerHeight: 26,
              markerFill: '#06b6d4',
              markerFillOpacity: 0.35,
              markerLineColor: '#22d3ee',
              markerLineWidth: 2.5,
            },
            {
              textName: '🧲 顶点吸附',
              textSize: 10,
              textFill: '#22d3ee',
              textHaloFill: '#082f49',
              textHaloRadius: 2.5,
              textDy: -22,
              textWeight: 'bold',
            },
          ],
        });
        previewLayer.addGeometry(snapMarker);
      }

      // 3. 线段方位角与实时长度动态注记
      if (pts.length >= 2) {
        const pPrev = pts[pts.length - 2];
        const pCurr = pts[pts.length - 1];
        const segDist = calculateSphericalDistance(pPrev, pCurr);
        const az = calculateAzimuth(pPrev, pCurr);
        const midCoord: [number, number] = [
          (pPrev[0] + pCurr[0]) / 2,
          (pPrev[1] + pCurr[1]) / 2,
        ];
        const segLabelMarker = new maptalks.Marker(midCoord, {
          symbol: {
            textName: `${formatDistance(segDist)} | ${az.degrees}°`,
            textSize: 10,
            textFill: hasTopoError ? '#fca5a5' : '#fef08a',
            textHaloFill: '#1c1917',
            textHaloRadius: 2.5,
            textWeight: 'bold',
          },
        });
        previewLayer.addGeometry(segLabelMarker);
      }

      // 4. 几何图元半透明引导预览
      if (drawingTool === 'straight-arrow') {
        if (pts.length >= 2) {
          const arrowCoords = calculateStraightArrow(pts);
          if (arrowCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([arrowCoords], { symbol }));
          }
        }
      } else if (drawingTool === 'attack-arrow') {
        if (pts.length >= 2) {
          const arrowCoords = calculateAttackArrow(pts);
          if (arrowCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([arrowCoords], { symbol }));
          }
        }
      } else if (drawingTool === 'pincer-arrow') {
        if (pts.length >= 2) {
          const arrowCoords = calculatePincerArrow(pts);
          if (arrowCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([arrowCoords], { symbol }));
          }
        }
      } else if (drawingTool === 'gathering-place') {
        if (pts.length >= 3) {
          const gatherCoords = calculateGatheringPlace(pts);
          if (gatherCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([gatherCoords], { symbol }));
          }
        }
      } else if (drawingTool === 'sector') {
        if (pts.length >= 2) {
          const sectorCoords = calculateSector(pts[0], pts[1], 90);
          if (sectorCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([sectorCoords], { symbol }));
          }
        }
      } else if (drawingTool === 'circle') {
        if (pts.length >= 2) {
          const radius = calculateSphericalDistance(pts[0], pts[1]);
          previewLayer.addGeometry(new maptalks.Circle(pts[0], radius, { symbol }));
        }
      } else if (drawingTool === 'rectangle') {
        if (pts.length >= 2) {
          const [p1, p2] = pts;
          const rectCoords: [number, number][] = [
            [p1[0], p1[1]],
            [p2[0], p1[1]],
            [p2[0], p2[1]],
            [p1[0], p2[1]],
          ];
          previewLayer.addGeometry(new maptalks.Polygon([rectCoords], { symbol }));
        }
      } else if (drawingTool === 'polygon') {
        if (pts.length >= 2) {
          previewLayer.addGeometry(new maptalks.LineString(pts, { symbol }));
          if (pts.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([pts], { symbol }));
          }
        }
      } else if (drawingTool === 'polyline' || drawingTool === 'freehand') {
        if (pts.length >= 2) {
          previewLayer.addGeometry(new maptalks.LineString(pts, { symbol }));
        }
      }
    },
    [drawingTool, previewLayerRef]
  );

  const undoPoint = useCallback(() => {
    if (drawingPointsRef.current.length > 0) {
      const newPts = drawingPointsRef.current.slice(0, -1);
      drawingPointsRef.current = newPts;
      setDrawingPoints(newPts);
      renderPreview(newPts);
    }
  }, [renderPreview]);

  const finishCurrentDrawing = useCallback(() => {
    const pts = drawingPointsRef.current;
    if (pts.length >= 2) {
      finishDrawing(pts);
    }
  }, [finishDrawing]);

  const clearDrawing = useCallback(() => {
    drawingPointsRef.current = [];
    setDrawingPoints([]);
    previewLayerRef.current?.clear();
    onTopologyWarningRef.current?.(null);
    onActiveSegmentChangeRef.current?.(null);
  }, [previewLayerRef]);

  return {
    drawingPoints,
    drawingPointsRef,
    setDrawingPoints,
    getCandidateVertices,
    finishDrawing,
    renderPreview,
    undoPoint,
    finishCurrentDrawing,
    clearDrawing,
  };
}
