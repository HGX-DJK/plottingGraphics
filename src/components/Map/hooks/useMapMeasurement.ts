import { useState, useRef, useEffect, useCallback } from 'react';
import {
  calculateSphericalDistance,
  formatDistance,
  calculateSphericalPolygonArea,
  formatArea,
} from '../../../utils/geoUtils';

export interface MeasureResult {
  kind: 'distance' | 'area';
  value: number; // 米 或 平方米
  text: string; // 格式化文本 (如 3.25 km, 15.6 ha)
  pointCount: number;
}

interface UseMapMeasurementOptions {
  drawingTool: string | null;
  measureLayerRef: React.MutableRefObject<any>;
  onMeasureResultChange?: (result: MeasureResult | null) => void;
  onDrawingPointsChange?: (count: number) => void;
}

export function useMapMeasurement({
  drawingTool,
  measureLayerRef,
  onMeasureResultChange,
  onDrawingPointsChange,
}: UseMapMeasurementOptions) {
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const measurePointsRef = useRef<[number, number][]>([]);
  measurePointsRef.current = measurePoints;

  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);
  const measureToolRef = useRef<'measure-distance' | 'measure-area' | null>(null);

  const onMeasureResultChangeRef = useRef(onMeasureResultChange);
  onMeasureResultChangeRef.current = onMeasureResultChange;

  const isMeasureTool =
    drawingTool === 'measure-distance' || drawingTool === 'measure-area';

  // 向上汇报当前打点数量
  useEffect(() => {
    if (isMeasureTool) {
      onDrawingPointsChange?.(measurePoints.length);
    }
  }, [isMeasureTool, measurePoints.length, onDrawingPointsChange]);

  // 量算读数结果回传
  useEffect(() => {
    onMeasureResultChangeRef.current?.(measureResult);
  }, [measureResult]);

  /**
   * 渲染量算几何体并同步读数。
   * 测距：折线 + 顶点标定 + 终点总长标注；测面：多边形 + 顶点标定 + 中心面积标注。
   */
  const renderMeasure = useCallback(
    (
      tool: 'measure-distance' | 'measure-area',
      pts: [number, number][],
      maptalks: any
    ): MeasureResult | null => {
      const measureLayer = measureLayerRef.current;
      if (!measureLayer || !maptalks) return null;

      measureLayer.clear();
      if (pts.length === 0) return null;

      // 顶点标定圆点 (移动端落点反馈)
      const vertexMarkers = pts.map(
        (pt) =>
          new maptalks.Marker(pt, {
            symbol: [
              {
                markerType: 'ellipse',
                markerWidth: 10,
                markerHeight: 10,
                markerFill: '#ffffff',
                markerFillOpacity: 1,
                markerLineColor: tool === 'measure-distance' ? '#f59e0b' : '#10b981',
                markerLineWidth: 2.5,
              },
            ],
          })
      );

      if (tool === 'measure-distance') {
        if (pts.length < 2) {
          measureLayer.addGeometry(vertexMarkers);
          return {
            kind: 'distance',
            value: 0,
            text: '至少需要 2 个点',
            pointCount: pts.length,
          };
        }

        let totalDist = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          totalDist += calculateSphericalDistance(pts[i], pts[i + 1]);
        }

        const line = new maptalks.LineString(pts, {
          symbol: {
            lineColor: '#f59e0b',
            lineWidth: 3,
            lineDasharray: [6, 4],
          },
        });
        const endMarker = new maptalks.Marker(pts[pts.length - 1], {
          symbol: {
            textName: `总长: ${formatDistance(totalDist)}`,
            textSize: 12,
            textFill: '#fbbf24',
            textHaloFill: '#111827',
            textHaloRadius: 3,
            textDy: -15,
            textWeight: 'bold',
          },
        });
        measureLayer.addGeometry([line, endMarker, ...vertexMarkers]);

        return {
          kind: 'distance',
          value: totalDist,
          text: formatDistance(totalDist),
          pointCount: pts.length,
        };
      }

      // 测面
      if (pts.length < 3) {
        measureLayer.addGeometry(vertexMarkers);
        return {
          kind: 'area',
          value: 0,
          text: '至少需要 3 个点',
          pointCount: pts.length,
        };
      }

      const area = calculateSphericalPolygonArea(pts);
      const poly = new maptalks.Polygon([pts], {
        symbol: {
          lineColor: '#10b981',
          lineWidth: 2.5,
          lineDasharray: [5, 5],
          polygonFill: '#10b981',
          polygonOpacity: 0.3,
        },
      });
      const centerMarker = new maptalks.Marker(pts[pts.length - 1], {
        symbol: {
          textName: `面积: ${formatArea(area)}`,
          textSize: 12,
          textFill: '#34d399',
          textHaloFill: '#111827',
          textHaloRadius: 3,
          textDy: -15,
          textWeight: 'bold',
        },
      });
      measureLayer.addGeometry([poly, centerMarker, ...vertexMarkers]);

      return {
        kind: 'area',
        value: area,
        text: formatArea(area),
        pointCount: pts.length,
      };
    },
    [measureLayerRef]
  );

  const handleMeasureClick = useCallback(
    (coord: [number, number], tool: 'measure-distance' | 'measure-area', maptalks: any) => {
      const newPts = [...measurePointsRef.current, coord];
      measurePointsRef.current = newPts;
      setMeasurePoints(newPts);
      setMeasureResult(renderMeasure(tool, newPts, maptalks));
    },
    [renderMeasure]
  );

  const undoMeasurePoint = useCallback(
    (maptalks: any) => {
      const pts = measurePointsRef.current;
      if (pts.length > 0) {
        const newPts = pts.slice(0, -1);
        measurePointsRef.current = newPts;
        setMeasurePoints(newPts);
        if (measureToolRef.current) {
          setMeasureResult(renderMeasure(measureToolRef.current, newPts, maptalks));
        }
      }
    },
    [renderMeasure]
  );

  const clearMeasure = useCallback(() => {
    measurePointsRef.current = [];
    setMeasurePoints([]);
    setMeasureResult(null);
    measureToolRef.current = null;
    measureLayerRef.current?.clear();
  }, [measureLayerRef]);

  return {
    measurePoints,
    measurePointsRef,
    measureResult,
    measureToolRef,
    isMeasureTool,
    renderMeasure,
    handleMeasureClick,
    undoMeasurePoint,
    clearMeasure,
  };
}
