import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  memo,
} from 'react';
import { PlotFeature, PlotLayer, PlotFeatureType, BasemapType } from '../../types';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { calculateSphericalDistance, calculateAzimuth, findSnapTarget } from '../../utils/geoUtils';
import { createBaseMapLayer } from './utils/mapBasemap';
import {
  createGeometryFromFeature,
  calculateFeatureBoundsAndCenter,
  calculateTargetZoom,
} from './utils/featureGeometry';
import { useMapMeasurement, MeasureResult } from './hooks/useMapMeasurement';
import { usePlotDrawing } from './hooks/usePlotDrawing';

export type { MeasureResult };

export interface MaptalksContainerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  resetNorth: () => void;
  undoPoint: () => void;
  finishCurrentDrawing: () => void;
  undoMeasurePoint: () => void;
  clearMeasure: () => void;
  locateUser: (coord: [number, number]) => void;
  focusFeature: (target: string | PlotFeature) => void;
  flyToLocation: (coord: [number, number], title?: string, subtitle?: string, zoom?: number) => void;
  clearSearchMarker: () => void;
  captureMapImage: () => Promise<string>;
  getCenterCoordinate: () => [number, number];
  addPointAtCenter: () => [number, number] | null;
  insertVertex: (index: number) => void;
  deleteVertex: (index: number) => void;
  startVertexEdit: (
    featureId: string,
    onUpdateCoords: (coords: [number, number][]) => void,
    onSelectVertex?: (index: number) => void
  ) => void;
  selectVertex: (index: number) => void;
  moveSelectedVertex: (newCoord: [number, number]) => void;
  nudgeSelectedVertex: (dxMeters: number, dyMeters: number) => void;
  stopVertexEdit: () => void;
}

interface MaptalksContainerProps {
  layers: PlotLayer[];
  features: PlotFeature[];
  activeLayerId: string;
  selectedFeatureId: string | null;
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  basemap: BasemapType;
  enableSnapping?: boolean;
  onSelectFeature: (featureId: string | null) => void;
  onCreateFeature: (feature: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancelDrawing: () => void;
  onCoordinatesChange?: (coords: [number, number], zoom: number) => void;
  onBearingChange?: (bearing: number, pitch: number) => void;
  onDrawingPointsChange?: (count: number) => void;
  onMeasureResultChange?: (result: MeasureResult | null) => void;
  onTopologyWarning?: (msg: string | null) => void;
  onActiveSegmentChange?: (segment: { length: number; azimuth: { degrees: number; text: string } } | null) => void;
  onSnapFeedback?: (snapped: boolean) => void;
  reticleMode?: boolean;
}

const MaptalksContainerInner = forwardRef<MaptalksContainerRef, MaptalksContainerProps>(
  (
    {
      layers,
      features,
      activeLayerId,
      selectedFeatureId,
      drawingTool,
      basemap,
      enableSnapping = true,
      reticleMode = true,
      onSelectFeature,
      onCreateFeature,
      onCancelDrawing,
      onCoordinatesChange,
      onBearingChange,
      onDrawingPointsChange,
      onMeasureResultChange,
      onTopologyWarning,
      onActiveSegmentChange,
      onSnapFeedback,
    },
    ref
  ) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const baseTileLayerRef = useRef<any>(null);
    const previewLayerRef = useRef<any>(null);
    const measureLayerRef = useRef<any>(null);

    const [maptalksReady, setMaptalksReady] = useState<boolean>(() => {
      return typeof window !== 'undefined' && !!(window as any).maptalks;
    });
    const [maptalksFailed, setMaptalksFailed] = useState<boolean>(false);

    /**
     * 地图实例是否已创建完成。
     *
     * MapTalks GL 以 async 方式从 CDN 注入，引擎就绪时刻晚于本组件挂载时刻。
     * 而「图层同步」与「要素几何重建」两个 effect 在地图未就绪时只能直接 return，
     * 若它们的依赖里没有「地图就绪」这一信号，就会在建图完成后永远不再执行，
     * 导致「已登录状态下直接刷新页面 → 要素全部不渲染」。
     *
     * 这里用显式状态把「建图完成」这件事显式广播出去，供上述 effect 依赖。
     */
    const [mapReady, setMapReady] = useState<boolean>(false);

    const activeLayerIdRef = useRef(activeLayerId);
    activeLayerIdRef.current = activeLayerId;

    const layersRef = useRef(layers);
    layersRef.current = layers;

    const featuresRef = useRef(features);
    featuresRef.current = features;

    const enableSnappingRef = useRef(enableSnapping);
    enableSnappingRef.current = enableSnapping;
    const reticleModeRef = useRef(reticleMode);
    useEffect(() => {
      reticleModeRef.current = reticleMode;
    }, [reticleMode]);
    const lastSnappedStateRef = useRef<boolean>(false);

    const onSelectFeatureRef = useRef(onSelectFeature);
    onSelectFeatureRef.current = onSelectFeature;

    const onActiveSegmentChangeRef = useRef(onActiveSegmentChange);
    onActiveSegmentChangeRef.current = onActiveSegmentChange;

    const onSnapFeedbackRef = useRef(onSnapFeedback);
    onSnapFeedbackRef.current = onSnapFeedback;

    const onCoordinatesChangeRef = useRef(onCoordinatesChange);
    onCoordinatesChangeRef.current = onCoordinatesChange;

    // 绘制工具与图层锁定态以 ref 镜像，供几何体事件回调读取最新值。
    // 这样切换绘制工具 / 锁定图层时无需重建任何几何体。
    const drawingToolRef = useRef(drawingTool);
    drawingToolRef.current = drawingTool;

    const lockedLayerIdsRef = useRef<Set<string>>(new Set());
    lockedLayerIdsRef.current = new Set(layers.filter((l) => l.locked).map((l) => l.id));

    // 已渲染几何体登记表：增量重建的核心。
    // 记录每个要素当前挂在地图上的几何体实例，只有内容或选中态真正变化的要素才会被重建。
    const renderedGeomsRef = useRef<
      Map<
        string,
        { feature: PlotFeature; geom: any; layerId: string; selected: boolean }
      >
    >(new Map());

    // 准星中心落点与程序化打点委托 Ref
    const addPointAtCoordRef = useRef<((coord: [number, number]) => [number, number] | null) | null>(null);

    // 1. 空间量算引擎 Hook
    const {
      measurePointsRef,
      measureToolRef,
      isMeasureTool,
      handleMeasureClick,
      undoMeasurePoint,
      clearMeasure,
    } = useMapMeasurement({
      drawingTool,
      measureLayerRef,
      onMeasureResultChange,
      onDrawingPointsChange,
    });

    // 2. 交互标绘引擎 Hook
    const {
      drawingPointsRef,
      setDrawingPoints,
      getCandidateVertices,
      finishDrawing,
      renderPreview,
      undoPoint,
      finishCurrentDrawing,
      clearDrawing,
    } = usePlotDrawing({
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
    });

    // 精准聚焦与视口居中
    const focusFeatureOnMap = (feat: PlotFeature) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const calc = calculateFeatureBoundsAndCenter(feat);
      if (!calc) return;

      const { center, spanLng, spanLat, isSinglePoint } = calc;
      const targetZoom = calculateTargetZoom(spanLng, spanLat, isSinglePoint, map.getZoom());

      map.animateTo(
        {
          center,
          zoom: targetZoom,
        },
        { duration: 500 }
      );

      // 显示高亮聚焦脉冲光环 (引导视线)
      const maptalks = (window as any).maptalks;
      if (maptalks) {
        let focusLayer = map.getLayer('system-focus-beacon');
        if (!focusLayer) {
          focusLayer = new maptalks.VectorLayer('system-focus-beacon', [], { zIndex: 1001 }).addTo(map);
        }
        focusLayer.clear();
        const beacon = new maptalks.Marker(center, {
          symbol: [
            {
              markerType: 'ellipse',
              markerWidth: 44,
              markerHeight: 44,
              markerFill: '#38bdf8',
              markerFillOpacity: 0.35,
              markerLineColor: '#0284c7',
              markerLineWidth: 2,
            },
            {
              markerType: 'ellipse',
              markerWidth: 16,
              markerHeight: 16,
              markerFill: '#f59e0b',
              markerLineColor: '#ffffff',
              markerLineWidth: 2.5,
            },
          ],
        });
        focusLayer.addGeometry(beacon);
        setTimeout(() => {
          try {
            focusLayer?.clear();
          } catch (e) {}
        }, 2200);
      }
    };

    // 顶点二次拖拽与点击重定位状态管理
    const activeEditStateRef = useRef<{
      featureId: string;
      targetFeat: PlotFeature;
      currentCoords: [number, number][];
      selectedIndex: number;
      onUpdateCoords: (coords: [number, number][]) => void;
      onSelectVertex?: (index: number) => void;
    } | null>(null);

    /**
     * 微调预览图层（与要素所属数据图层物理隔离）。
     *
     * 背景：早期实现把预览几何体直接写回要素所属的数据图层，且沿用要素自身的 id。
     * 这会让「渲染账本（renderedGeomsRef）」与图层实际内容失同步 ——
     * 账本里记的还是那个已被 removeGeometry 摘掉的旧几何体，而预览几何体留在图层里。
     * 保存微调时增量重建只按账本去摘除（摘的是早已失效的那个，等于没摘），
     * 预览几何体原封不动留在层里，紧接着新几何体又以同一 id 入层，
     * 于是同一图层出现两个同 id 几何体，MapTalks 直接抛
     * "Duplicate geometry id in layer(...)" 并中断整条渲染管线。
     *
     * 改为独立图层后：数据图层的几何体集合完全不被微调流程触碰，
     * 账本与图层内容始终一致，重复 id 在结构上就不可能再发生。
     */
    const getEditPreviewLayer = () => {
      const map = mapInstanceRef.current;
      const maptalks = (window as any).maptalks;
      if (!map || !maptalks) return null;
      let previewLayer = map.getLayer('system-edit-preview');
      if (!previewLayer) {
        previewLayer = new maptalks.VectorLayer('system-edit-preview', [], {
          zIndex: 1004,
          enableAltitude: true,
        }).addTo(map);
      }
      return previewLayer;
    };

    /**
     * 隐藏 / 恢复真实几何体的绘制。
     * 几何体本身仍留在数据图层与渲染账本里（只影响是否绘制），
     * 因此不会破坏「一个要素一个几何体」的对应关系。
     */
    const setTargetGeometryVisible = (featureId: string, visible: boolean) => {
      const entry = renderedGeomsRef.current.get(featureId);
      const geom = entry?.geom;
      if (!geom) return;
      try {
        if (visible) {
          if (typeof geom.show === 'function') geom.show();
        } else if (typeof geom.hide === 'function') {
          geom.hide();
        }
      } catch (e) {
        /* 几何体已随图层销毁时忽略 */
      }
    };

    /**
     * 重建微调预览几何体（独立图层 + 独立 id）。
     */
    const refreshEditPreview = () => {
      const state = activeEditStateRef.current;
      const map = mapInstanceRef.current;
      const maptalks = (window as any).maptalks;
      if (!state || !map || !maptalks) return;

      const previewLayer = getEditPreviewLayer();
      if (previewLayer) {
        previewLayer.clear();
        // 预览要素使用独立 id，与数据图层中的要素 id 天然不会撞车
        const previewFeat: PlotFeature = {
          ...state.targetFeat,
          id: `edit-preview-${state.targetFeat.id}`,
          coordinates: [...state.currentCoords],
        };
        const previewGeom = createGeometryFromFeature(maptalks, previewFeat, true);
        if (previewGeom) {
          // 微调期间真实几何体是隐藏的（收不到指针事件），
          // 因此把「点击面内部 → 当前拐点移动到点击处」的交互挂到预览形状上，
          // 保持原有操作手感不变。
          previewGeom.on('click tap', (e: any) => {
            const editState = activeEditStateRef.current;
            if (!editState || editState.selectedIndex < 0 || !e.coordinate) return;
            if (e.domEvent) e.domEvent.stopPropagation();
            const targetCoord: [number, number] = [
              Number(e.coordinate.x.toFixed(6)),
              Number(e.coordinate.y.toFixed(6)),
            ];
            editState.currentCoords[editState.selectedIndex] = targetCoord;
            updateEditingGeometry();
            renderEditHandles();
          });
          previewGeom.on('mouseover', () => map.setCursor('crosshair'));
          previewGeom.on('mouseout', () => map.setCursor('default'));
          previewLayer.addGeometry(previewGeom);
        }
      }

      // 真实几何体保持隐藏，由预览层接管显示（避免出现原形状 + 编辑形状两套轮廓）
      setTargetGeometryVisible(state.targetFeat.id, false);
    };

    const updateEditingGeometry = () => {
      const state = activeEditStateRef.current;
      if (!state) return;

      refreshEditPreview();
      state.onUpdateCoords([...state.currentCoords]);
    };

    const renderEditHandles = () => {
      const state = activeEditStateRef.current;
      const map = mapInstanceRef.current;
      const maptalks = (window as any).maptalks;
      if (!state || !map || !maptalks) return;

      let vertexLayer = map.getLayer('system-vertex-handles');
      if (!vertexLayer) {
        vertexLayer = new maptalks.VectorLayer('system-vertex-handles', [], {
          zIndex: 1005,
          enableAltitude: true,
        }).addTo(map);
      }
      vertexLayer.clear();

      state.currentCoords.forEach((coord, idx) => {
        const isSelected = idx === state.selectedIndex;

        const handleMarker = new maptalks.Marker(coord, {
          id: `vertex-handle-${idx}`,
          draggable: true,
          cursor: 'move',
          symbol: isSelected
            ? [
                {
                  markerType: 'ellipse',
                  markerWidth: 44,
                  markerHeight: 44,
                  markerFill: '#f59e0b',
                  markerFillOpacity: 0.35,
                  markerLineColor: '#fbbf24',
                  markerLineWidth: 2,
                },
                {
                  markerType: 'ellipse',
                  markerWidth: 34,
                  markerHeight: 34,
                  markerFill: '#f59e0b',
                  markerFillOpacity: 0.98,
                  markerLineColor: '#ffffff',
                  markerLineWidth: 3.5,
                },
                {
                  textName: `点${idx + 1}`,
                  textSize: 11,
                  textFill: '#ffffff',
                  textWeight: 'bold',
                  textHaloFill: '#78350f',
                  textHaloRadius: 2,
                },
              ]
            : [
                {
                  markerType: 'ellipse',
                  markerWidth: 30,
                  markerHeight: 30,
                  markerFill: '#2563eb',
                  markerFillOpacity: 0.95,
                  markerLineColor: '#ffffff',
                  markerLineWidth: 2.5,
                },
                {
                  textName: String(idx + 1),
                  textSize: 12,
                  textFill: '#ffffff',
                  textWeight: 'bold',
                  textHaloFill: '#1e3a8a',
                  textHaloRadius: 1.5,
                },
              ],
        });

        // 1. 点击/触控选中该拐点
        handleMarker.on('click tap', (e: any) => {
          if (e.domEvent) e.domEvent.stopPropagation();
          state.selectedIndex = idx;
          state.onSelectVertex?.(idx);
          renderEditHandles();
        });

        // 2. 触控按下：立刻阻止事件冒泡与临时禁用地图漫游以允许流畅拖动
        handleMarker.on('touchstart mousedown', (e: any) => {
          if (e.domEvent) e.domEvent.stopPropagation();
          state.selectedIndex = idx;
          state.onSelectVertex?.(idx);
          map.config('draggable', false);
        });

        // 3. 拖拽中：获取实时经纬度并动态重绘要素
        handleMarker.on('dragging', (e: any) => {
          const pt = e.coordinate || (handleMarker.getCoordinates ? handleMarker.getCoordinates() : null);
          if (!pt) return;

          state.currentCoords[idx] = [
            Number(pt.x.toFixed(6)),
            Number(pt.y.toFixed(6)),
          ];
          updateEditingGeometry();
        });

        // 4. 拖拽结束：恢复地图漫游拖拽
        handleMarker.on('touchend mouseup dragend', () => {
          map.config('draggable', true);
          renderEditHandles();
        });

        vertexLayer.addGeometry(handleMarker);
      });
    };

    // 暴露地图控制接口给外部悬浮按钮
    useImperativeHandle(ref, () => ({
      zoomIn: () => {
        mapInstanceRef.current?.zoomIn();
      },
      zoomOut: () => {
        mapInstanceRef.current?.zoomOut();
      },
      resetView: () => {
        mapInstanceRef.current?.animateTo(
          {
            center: [121.4737, 31.2304],
            zoom: 12.5,
            pitch: 0,
            bearing: 0,
          },
          { duration: 500 }
        );
      },
      resetNorth: () => {
        mapInstanceRef.current?.animateTo(
          {
            bearing: 0,
            pitch: 0,
          },
          { duration: 400 },
          (frame: any) => {
            if (frame && frame.state && frame.state.playState === 'finished') {
              onBearingChange?.(0, 0);
            }
          }
        );
      },
      undoPoint,
      finishCurrentDrawing,
      undoMeasurePoint: () => {
        const maptalks = (window as any).maptalks;
        if (maptalks) undoMeasurePoint(maptalks);
      },
      clearMeasure,
      locateUser: (coord: [number, number]) => {
        const map = mapInstanceRef.current;
        const maptalks = (window as any).maptalks;
        if (!map || !maptalks) return;

        map.animateTo(
          {
            center: coord,
            zoom: 16,
          },
          { duration: 800 }
        );

        let gpsLayer = map.getLayer('system-gps');
        if (!gpsLayer) {
          gpsLayer = new maptalks.VectorLayer('system-gps', [], { zIndex: 1000 }).addTo(map);
        }
        gpsLayer.clear();

        const pulseMarker = new maptalks.Marker(coord, {
          symbol: [
            {
              markerType: 'ellipse',
              markerWidth: 32,
              markerHeight: 32,
              markerFill: '#3b82f6',
              markerFillOpacity: 0.25,
              markerLineColor: '#60a5fa',
              markerLineWidth: 1.5,
            },
            {
              markerType: 'ellipse',
              markerWidth: 16,
              markerHeight: 16,
              markerFill: '#2563eb',
              markerLineColor: '#ffffff',
              markerLineWidth: 3,
            },
            {
              textName: '当前设备 GPS 位置',
              textSize: 11,
              textFill: '#60a5fa',
              textHaloFill: '#0b1120',
              textHaloRadius: 2.5,
              textDy: 24,
              textWeight: 'bold',
            },
          ],
        });
        gpsLayer.addGeometry(pulseMarker);
      },
      focusFeature: (target: string | PlotFeature) => {
        let feat: PlotFeature | undefined;
        if (typeof target === 'string') {
          feat = featuresRef.current.find((f) => f.id === target);
        } else {
          feat = target;
        }
        if (feat) {
          focusFeatureOnMap(feat);
        }
      },
      flyToLocation: (coord: [number, number], title?: string, subtitle?: string, zoom = 16) => {
        const map = mapInstanceRef.current;
        const maptalks = (window as any).maptalks;
        if (!map || !maptalks) return;

        map.animateTo(
          {
            center: coord,
            zoom,
          },
          { duration: 650 }
        );

        let searchLayer = map.getLayer('system-search-marker');
        if (!searchLayer) {
          searchLayer = new maptalks.VectorLayer('system-search-marker', [], { zIndex: 1002 }).addTo(map);
        }
        searchLayer.clear();

        // 1. 动态水波光环底座
        const halo = new maptalks.Marker(coord, {
          symbol: [
            {
              markerType: 'ellipse',
              markerWidth: 44,
              markerHeight: 44,
              markerFill: '#ef4444',
              markerFillOpacity: 0.22,
              markerLineColor: '#f87171',
              markerLineWidth: 1.5,
            },
            {
              markerType: 'ellipse',
              markerWidth: 16,
              markerHeight: 16,
              markerFill: '#dc2626',
              markerLineColor: '#ffffff',
              markerLineWidth: 2.5,
            },
          ],
        });

        // 2. 悬浮地标指示卡片 (标题 + 地址/坐标)
        if (title) {
          const label = new maptalks.Marker(coord, {
            symbol: [
              {
                textName: title,
                textSize: 12,
                textFill: '#ffffff',
                textWeight: 'bold',
                textHaloFill: '#1e293b',
                textHaloRadius: 3,
                textDy: -24,
              },
              ...(subtitle
                ? [
                    {
                      textName: subtitle.length > 22 ? subtitle.slice(0, 20) + '...' : subtitle,
                      textSize: 10,
                      textFill: '#cbd5e1',
                      textHaloFill: '#0f172a',
                      textHaloRadius: 2,
                      textDy: -8,
                    },
                  ]
                : []),
            ],
          });
          searchLayer.addGeometry([halo, label]);
        } else {
          searchLayer.addGeometry(halo);
        }
      },
      clearSearchMarker: () => {
        const map = mapInstanceRef.current;
        if (!map) return;
        const searchLayer = map.getLayer('system-search-marker');
        if (searchLayer) searchLayer.clear();
      },
      captureMapImage: async (): Promise<string> => {
        const map = mapInstanceRef.current;
        if (!map) throw new Error('地图尚未初始化');

        // 优先使用 MapTalks 原生 toDataURL 导出
        if (typeof (map as any).toDataURL === 'function') {
          try {
            const dataUrl = (map as any).toDataURL({ mimeType: 'image/png', save: false });
            if (dataUrl && dataUrl.startsWith('data:image/')) {
              return dataUrl;
            }
          } catch (err) {
            console.warn('MapTalks toDataURL fallback to canvas:', err);
          }
        }

        // 兜底方案：直接捕获容器内的 WebGL / 2D Canvas
        const container = mapContainerRef.current;
        const canvas = container?.querySelector('canvas');
        if (canvas) {
          return canvas.toDataURL('image/png');
        }
        throw new Error('未检测到可用的地图画布');
      },
      getCenterCoordinate: (): [number, number] => {
        const map = mapInstanceRef.current;
        if (!map) return [121.4737, 31.2304];
        const center = map.getCenter();
        return [Number(center.x.toFixed(6)), Number(center.y.toFixed(6))];
      },
      addPointAtCenter: (): [number, number] | null => {
        const map = mapInstanceRef.current;
        if (!map) return null;
        const center = map.getCenter();
        const centerCoord: [number, number] = [
          Number(center.x.toFixed(6)),
          Number(center.y.toFixed(6)),
        ];
        if (addPointAtCoordRef.current) {
          return addPointAtCoordRef.current(centerCoord);
        }
        return null;
      },
      insertVertex: (index: number) => {
        const state = activeEditStateRef.current;
        if (!state || state.currentCoords.length === 0) return;
        const idx = Math.max(0, Math.min(state.currentCoords.length - 1, index));
        const cur = state.currentCoords[idx];
        const next = state.currentCoords[(idx + 1) % state.currentCoords.length];
        const mid: [number, number] = [
          Number(((cur[0] + next[0]) / 2).toFixed(6)),
          Number(((cur[1] + next[1]) / 2).toFixed(6)),
        ];
        state.currentCoords.splice(idx + 1, 0, mid);
        state.selectedIndex = idx + 1;
        updateEditingGeometry();
        renderEditHandles();
        state.onUpdateCoords(state.currentCoords);
        state.onSelectVertex?.(idx + 1);
      },
      deleteVertex: (index: number) => {
        const state = activeEditStateRef.current;
        if (!state) return;
        const minPts =
          state.targetFeat.type === 'polygon' || state.targetFeat.type === 'gathering-place' ? 3 : 2;
        if (state.currentCoords.length <= minPts) return;
        const idx = Math.max(0, Math.min(state.currentCoords.length - 1, index));
        state.currentCoords.splice(idx, 1);
        state.selectedIndex = Math.min(state.selectedIndex, state.currentCoords.length - 1);
        updateEditingGeometry();
        renderEditHandles();
        state.onUpdateCoords(state.currentCoords);
        state.onSelectVertex?.(state.selectedIndex);
      },
      startVertexEdit: (
        featureId: string,
        onUpdateCoords: (coords: [number, number][]) => void,
        onSelectVertex?: (index: number) => void
      ) => {
        const map = mapInstanceRef.current;
        const maptalks = (window as any).maptalks;
        if (!map || !maptalks) return;

        const targetFeat = featuresRef.current.find((f) => f.id === featureId);
        if (!targetFeat || !targetFeat.coordinates || targetFeat.coordinates.length === 0) return;

        // 若已有其它要素处于微调中，先把上一个要素完整收尾
        // （清预览、恢复其真实几何体显示），避免上一个要素残留隐藏状态。
        const prevState = activeEditStateRef.current;
        if (prevState && prevState.featureId !== featureId) {
          const prevPreviewLayer = map.getLayer('system-edit-preview');
          if (prevPreviewLayer) {
            prevPreviewLayer.clear();
          }
          setTargetGeometryVisible(prevState.featureId, true);
        }

        const currentCoords: [number, number][] = targetFeat.coordinates.map((c) => [c[0], c[1]]);

        activeEditStateRef.current = {
          featureId,
          targetFeat,
          currentCoords,
          selectedIndex: 0,
          onUpdateCoords,
          onSelectVertex,
        };

        // 进入微调即建立预览形状：真实几何体隐藏，预览层接管显示，
        // 拐点把手叠在预览形状之上，视觉上始终只有一套轮廓。
        refreshEditPreview();
        renderEditHandles();
        onSelectVertex?.(0);
      },
      selectVertex: (index: number) => {
        if (activeEditStateRef.current) {
          activeEditStateRef.current.selectedIndex = index;
          renderEditHandles();
        }
      },
      moveSelectedVertex: (newCoord: [number, number]) => {
        const state = activeEditStateRef.current;
        if (state && state.selectedIndex >= 0) {
          state.currentCoords[state.selectedIndex] = [
            Number(newCoord[0].toFixed(6)),
            Number(newCoord[1].toFixed(6)),
          ];
          updateEditingGeometry();
          renderEditHandles();
        }
      },
      nudgeSelectedVertex: (dxMeters: number, dyMeters: number) => {
        const state = activeEditStateRef.current;
        if (!state || state.selectedIndex < 0) return;
        const cur = state.currentCoords[state.selectedIndex];
        const lat = cur[1];
        const deltaLat = dyMeters / 111320;
        const deltaLng = dxMeters / (111320 * Math.cos((lat * Math.PI) / 180));
        state.currentCoords[state.selectedIndex] = [
          Number((cur[0] + deltaLng).toFixed(6)),
          Number((cur[1] + deltaLat).toFixed(6)),
        ];
        updateEditingGeometry();
        renderEditHandles();
      },
      stopVertexEdit: () => {
        const state = activeEditStateRef.current;
        activeEditStateRef.current = null;
        const map = mapInstanceRef.current;
        if (!map) return;
        const vertexLayer = map.getLayer('system-vertex-handles');
        if (vertexLayer) {
          vertexLayer.clear();
        }
        // 清除微调预览几何体
        const editPreviewLayer = map.getLayer('system-edit-preview');
        if (editPreviewLayer) {
          editPreviewLayer.clear();
        }
        // 恢复真实几何体显示：取消微调时地图应回到原始形状，
        // 保存微调时也会被随后触发的增量重建替换成新形状。
        if (state) {
          setTargetGeometryVisible(state.featureId, true);
        }
        map.config('draggable', true);
      },
    }));

    // 检测 window.maptalks 注入状态
    useEffect(() => {
      if (maptalksReady) return;
      setMaptalksFailed(false);

      const POLL_INTERVAL = 150;
      const TIMEOUT = 20000;
      let waited = 0;

      const timer = setInterval(() => {
        if (typeof window !== 'undefined' && (window as any).maptalks) {
          setMaptalksReady(true);
          clearInterval(timer);
          return;
        }
        waited += POLL_INTERVAL;
        if (waited >= TIMEOUT) {
          clearInterval(timer);
          setMaptalksFailed(true);
        }
      }, POLL_INTERVAL);

      return () => clearInterval(timer);
    }, [maptalksReady]);

    // 初始化 MapTalks 地图实例
    useEffect(() => {
      if (!maptalksReady || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const maptalks = (window as any).maptalks;
      const baseTileLayer = createBaseMapLayer(maptalks, basemap);
      baseTileLayerRef.current = baseTileLayer;

      const map = new maptalks.Map(mapContainerRef.current, {
        center: [121.4737, 31.2304],
        zoom: 12.5,
        minZoom: 3,
        maxZoom: 19,
        pitch: 0,
        maxPitch: 70,
        bearing: 0,
        baseLayer: baseTileLayer,
        attribution: false,
        zoomControl: false,
        scaleControl: false,
        spatialReference: {
          projection: 'EPSG:3857',
        },
      });

      mapInstanceRef.current = map;

      /**
       * 地图实例一旦重建，此前登记的几何体全部失效。
       *
       * renderedGeomsRef 缓存的是「要素 → 挂在地图上的几何体实例」映射，
       * 而几何体是地图实例的子对象：map.remove() 会连同所有图层与几何体一起销毁。
       * 若不清空缓存，增量重建会认为「要素内容与选中态都没变 → 复用现有几何体」，
       * 从而在新地图上什么都不画（表现为：刷新后地图上没有要素）。
       *
       * 触发场景：React StrictMode 的 effect 双调用（开发态必现）、
       * 引擎就绪后重新建图、以及任何导致地图实例被销毁重建的路径。
       */
      renderedGeomsRef.current.clear();

      // 实时绘制引导预览层
      const previewLayer = new maptalks.VectorLayer('system-preview', [], {
        zIndex: 999,
        enableAltitude: true,
      }).addTo(map);
      previewLayerRef.current = previewLayer;

      // 实时测距测面量算层
      const measureLayer = new maptalks.VectorLayer('system-measure', [], {
        zIndex: 998,
        enableAltitude: true,
      }).addTo(map);
      measureLayerRef.current = measureLayer;

      // 视口尺寸同步
      const syncMapSize = () => {
        if (!mapInstanceRef.current || !mapContainerRef.current) return;
        const width = mapContainerRef.current.clientWidth;
        const height = mapContainerRef.current.clientHeight;
        if (width > 0 && height > 0) {
          try {
            mapInstanceRef.current.checkSize();
          } catch (e) {}
        }
      };

      requestAnimationFrame(() => {
        syncMapSize();
        requestAnimationFrame(syncMapSize);
      });
      const resizeTimer = window.setTimeout(syncMapSize, 300);

      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => syncMapSize());
        resizeObserver.observe(mapContainerRef.current);
      }

      // 视口中心与缩放监听
      //
      // 性能修正：原实现监听 mousemove / touchmove，鼠标每移动一帧都会回调上层 setState，
      // 导致整棵组件树以 ~60fps 重渲染（移动端触控时明显掉帧）。
      // 现改为监听视口变化 (viewchange) 并做 120ms 节流：
      //   1) 触发频率从"每帧"降到"每次平移/缩放"，静止时完全静默；
      //   2) 取值改为地图真实中心点，语义与"视口中心"一致（原先取的是鼠标光标位置）。
      const VIEW_THROTTLE_MS = 120;
      let viewThrottleTimer: number | null = null;
      let lastViewEmit = 0;

      const emitViewState = () => {
        const center = map.getCenter();
        if (!center) return;
        onCoordinatesChangeRef.current?.(
          [Number(center.x), Number(center.y)],
          map.getZoom()
        );
      };

      const handleViewChange = () => {
        const now = Date.now();
        const elapsed = now - lastViewEmit;
        if (elapsed >= VIEW_THROTTLE_MS) {
          lastViewEmit = now;
          emitViewState();
        } else if (viewThrottleTimer === null) {
          viewThrottleTimer = window.setTimeout(() => {
            viewThrottleTimer = null;
            lastViewEmit = Date.now();
            emitViewState();
          }, VIEW_THROTTLE_MS - elapsed);
        }
      };

      map.on('viewchange', handleViewChange);
      emitViewState();

      // 监听地图旋转朝向 (Bearing) 与倾角 (Pitch)
      const handleMapTransform = () => {
        if (!map) return;
        const b = typeof map.getBearing === 'function' ? map.getBearing() : 0;
        const p = typeof map.getPitch === 'function' ? map.getPitch() : 0;
        onBearingChange?.(b, p);
      };

      map.on('rotate pitch viewchange moveend animateend zoomend', handleMapTransform);
      handleMapTransform();

      // 点击空白处取消要素选中，若在微调模式下则点击地图直接将选中的拐点移动至点击处
      map.on('click tap', (e: any) => {
        const editState = activeEditStateRef.current;
        if (editState && editState.selectedIndex >= 0 && e.coordinate) {
          const targetCoord: [number, number] = [
            Number(e.coordinate.x.toFixed(6)),
            Number(e.coordinate.y.toFixed(6)),
          ];
          editState.currentCoords[editState.selectedIndex] = targetCoord;
          updateEditingGeometry();
          renderEditHandles();
          return;
        }

        // 必须读 ref 而不是建图时捕获的 drawingTool 闭包变量：
        // 本 effect 的依赖是 [maptalksReady]，只在引擎就绪时执行一次，
        // 捕获到的 drawingTool 永远是初始值（null），标绘过程中点空白地图
        // 会误触发「取消选中」。
        if (!drawingToolRef.current && e.target === map) {
          onSelectFeature(null);
        }
      });

      // 建图完成：广播给依赖地图实例的 effect（图层同步 / 要素几何重建）
      setMapReady(true);

      return () => {
        window.clearTimeout(resizeTimer);
        if (viewThrottleTimer !== null) {
          window.clearTimeout(viewThrottleTimer);
          viewThrottleTimer = null;
        }
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        if (map) {
          map.off('viewchange', handleViewChange);
          map.remove();
          mapInstanceRef.current = null;
        }
        setMapReady(false);
      };
    }, [maptalksReady]);

    // 底图切换
    useEffect(() => {
      if (!mapInstanceRef.current || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      const newBaseLayer = createBaseMapLayer(maptalks, basemap);
      if (newBaseLayer) {
        mapInstanceRef.current.setBaseLayer(newBaseLayer);
        baseTileLayerRef.current = newBaseLayer;
      }
    }, [basemap, mapReady]);

    // 图层同步 (创建/更新/删除 MapTalks VectorLayers)
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      layers.forEach((layer) => {
        let vecLayer = map.getLayer(layer.id);
        if (!vecLayer) {
          vecLayer = new maptalks.VectorLayer(layer.id, [], {
            enableAltitude: true,
            opacity: layer.opacity,
          }).addTo(map);
        } else {
          vecLayer.setOpacity(layer.opacity);
        }

        if (layer.visible) {
          vecLayer.show();
        } else {
          vecLayer.hide();
        }
      });

      // 移除已删除的图层
      const currentLayerIds = new Set(layers.map((l) => l.id));
      const allLayers = map.getLayers();
      allLayers.forEach((l: any) => {
        const id = l.getId();
        if (!id.startsWith('system-') && !id.startsWith('base-') && !currentLayerIds.has(id)) {
          map.removeLayer(l);
        }
      });
    }, [layers, mapReady]);

    // 要素渲染与高亮更新（增量重建）
    //
    // 性能修正：原实现每次 features / layers / selectedFeatureId / drawingTool 变化都会
    // vecLayer.clear() 后对"所有图层的所有要素"重新构造几何体（点类要素还要现场拼 SVG
    // 并 base64 编码）。这意味着：仅是点选一个要素、切换一次绘制工具，都会触发全量重建。
    //
    // 现改为按要素粒度增量更新：
    //   - 要素对象引用未变且选中态未变  → 完全跳过，不碰地图；
    //   - 只有被编辑过的那个要素        → 移除旧几何体并重建；
    //   - 只有「旧选中 / 新选中」两项   → 因高亮样式不同而重建；
    //   - 删除 / 换图层的要素          → 移除旧几何体。
    // 绘制工具与图层锁定态改由 ref 读取，因此切换工具不再触发任何重建。
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      const rendered = renderedGeomsRef.current;
      const aliveIds = new Set<string>();

      const detachGeometry = (geom: any, layerId: string) => {
        if (!geom) return;
        const owner = map.getLayer(layerId);
        try {
          if (owner && typeof owner.removeGeometry === 'function') {
            owner.removeGeometry(geom);
          } else if (typeof geom.remove === 'function') {
            geom.remove();
          }
        } catch (e) {
          /* 几何体已随图层被移除时忽略 */
        }
      };

      features.forEach((feat) => {
        aliveIds.add(feat.id);

        const isSelected = feat.id === selectedFeatureId;
        const prev = rendered.get(feat.id);
        const vecLayer = map.getLayer(feat.layerId);
        // 要素内容与选中态都没变 → 复用现有几何体，零开销
        if (
          prev &&
          prev.feature === feat &&
          prev.selected === isSelected &&
          prev.layerId === feat.layerId &&
          vecLayer
        ) {
          return;
        }

        // 旧几何体失效（内容变更 / 选中态变更 / 换图层 / 图层已删除）→ 先摘除
        if (prev) {
          detachGeometry(prev.geom, prev.layerId);
          rendered.delete(feat.id);
        }

        if (!vecLayer) return;

        const geom = createGeometryFromFeature(maptalks, feat, isSelected);

        if (geom) {
          geom.on('click tap', (e: any) => {
            if (drawingToolRef.current) return;
            // 若当前正处于微调模式，点击要素内部区域同样将选中拐点移动至该点击位置
            if (activeEditStateRef.current && activeEditStateRef.current.selectedIndex >= 0 && e.coordinate) {
              if (e.domEvent) e.domEvent.stopPropagation();
              const targetCoord: [number, number] = [
                Number(e.coordinate.x.toFixed(6)),
                Number(e.coordinate.y.toFixed(6)),
              ];
              activeEditStateRef.current.currentCoords[activeEditStateRef.current.selectedIndex] = targetCoord;
              updateEditingGeometry();
              renderEditHandles();
              return;
            }
            if (e.domEvent) e.domEvent.stopPropagation();
            if (!lockedLayerIdsRef.current.has(feat.layerId)) {
              onSelectFeatureRef.current(feat.id);
            }
          });

          geom.on('mouseover', () => {
            if (!drawingToolRef.current) {
              map.setCursor('pointer');
            }
          });
          geom.on('mouseout', () => {
            if (!drawingToolRef.current) {
              map.setCursor('default');
            }
          });

          // 入层前去重：同一图层内出现重复 id 会让 MapTalks 直接抛错、
          // 中断整条渲染管线（表现为整张地图渲染中断并弹出错误框）。
          // 这里先摘除图层中同 id 的残留几何体，
          // 保证「一个要素一个几何体」这一不变式恒成立。
          try {
            if (typeof vecLayer.getGeometryById === 'function') {
              const duplicated = vecLayer.getGeometryById(feat.id);
              if (duplicated && duplicated !== geom) {
                vecLayer.removeGeometry(duplicated);
              }
            }
          } catch (e) {
            /* 几何体已随图层移除时忽略 */
          }

          try {
            vecLayer.addGeometry(geom);
          } catch (e) {
            // 兜底：引擎抛错会中断整条渲染管线，整张地图直接黑掉、
            // 只能靠 ErrorBoundary 弹「重新加载」自救 —— 对外业作业是不可接受的。
            // 这里降级处理：再摘一次同 id 几何体后重试；
            // 仍失败则放弃该要素的绘制，保住地图与其它要素不被拖垮。
            console.warn('[GeoPlot] 要素几何体入层失败，已跳过该要素渲染：', e);
            try {
              const duplicated =
                typeof vecLayer.getGeometryById === 'function'
                  ? vecLayer.getGeometryById(feat.id)
                  : null;
              if (duplicated && duplicated !== geom) {
                vecLayer.removeGeometry(duplicated);
              }
              vecLayer.addGeometry(geom);
            } catch (e2) {
              console.warn('[GeoPlot] 该要素渲染已放弃，不影响其它要素：', e2);
            }
          }
          rendered.set(feat.id, {
            feature: feat,
            geom,
            layerId: feat.layerId,
            selected: isSelected,
          });

          // 微调进行中：真实几何体保持隐藏，由预览层接管显示。
          // 若编辑期间发生过重建，这里重新隐藏一次，避免原形状突然冒出来。
          const editState = activeEditStateRef.current;
          if (editState && editState.featureId === feat.id) {
            try {
              if (typeof geom.hide === 'function') geom.hide();
            } catch (e) {
              /* 忽略 */
            }
          }
        }
      });

      // 清理已被删除的要素几何体
      const staleIds: string[] = [];
      rendered.forEach((_entry, id) => {
        if (!aliveIds.has(id)) staleIds.push(id);
      });
      staleIds.forEach((id) => {
        const entry = rendered.get(id);
        if (!entry) return;
        detachGeometry(entry.geom, entry.layerId);
        rendered.delete(id);
      });
    }, [features, layers, selectedFeatureId, mapReady]);

    // 选中要素时聚焦
    const prevSelectedIdRef = useRef<string | null>(null);
    useEffect(() => {
      if (!selectedFeatureId) {
        prevSelectedIdRef.current = null;
        return;
      }
      // 地图尚未就绪时不记录前值，等 mapReady 翻转后自动补一次聚焦
      if (!mapInstanceRef.current) return;
      if (prevSelectedIdRef.current !== selectedFeatureId) {
        prevSelectedIdRef.current = selectedFeatureId;
        const feat = features.find((f) => f.id === selectedFeatureId);
        if (feat) {
          focusFeatureOnMap(feat);
        }
      }
    }, [selectedFeatureId, features, mapReady]);

    // 交互标绘与量算事件监听
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      if (!drawingTool) {
        clearDrawing();
        clearMeasure();
        map.setCursor('default');
        return;
      }

      map.setCursor('crosshair');

      // 1. 禁用双击缩放 (避免快速双击闭合/完成绘制时地图镜头突然放大跳动)
      const prevDoubleClickZoom = typeof (map as any).isDoubleClickZoomable === 'function'
        ? (map as any).isDoubleClickZoomable()
        : map.options?.doubleClickZoom ?? true;
      map.setOptions({ doubleClickZoom: false });

      // 2. 拖拽平移防抖与抬手误触保护 (记录最后拖拽结束时间)
      let lastMapDragEndTime = 0;
      const handleMapDragEnd = () => {
        lastMapDragEndTime = Date.now();
      };
      map.on('moveend dragend animateend', handleMapDragEnd);

      // 空间量算模式 (测距与测面)
      if (drawingTool === 'measure-distance' || drawingTool === 'measure-area') {
        if (measureToolRef.current !== drawingTool) {
          measureToolRef.current = drawingTool;
          clearMeasure();
        }

        const onMeasureClick = (e: any) => {
          // 准星模式下禁止通过点击画布落点 (由准星落点按钮精确添加)
          if (reticleModeRef.current) return;
          // 拖拽平移结束 180ms 内丢弃抬手伪点击
          if (Date.now() - lastMapDragEndTime < 180) return;
          const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
          handleMeasureClick(coord, drawingTool, maptalks);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
        };

        addPointAtCoordRef.current = (inputCoord: [number, number]) => {
          let mCoord = inputCoord;
          if (enableSnappingRef.current) {
            const res = typeof map.getResolution === 'function' ? map.getResolution() : 10;
            const thresholdMeters = Math.max(10, res * 22);
            const candidates = getCandidateVertices();
            const snap = findSnapTarget(mCoord, candidates, thresholdMeters);
            if (snap.snapped) {
              mCoord = snap.snappedCoord;
              onSnapFeedbackRef.current?.(true);
            }
          }
          handleMeasureClick(mCoord, drawingTool, maptalks);
          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
          return mCoord;
        };

        map.on('click', onMeasureClick);
        return () => {
          map.setOptions({ doubleClickZoom: prevDoubleClickZoom });
          map.off('moveend dragend animateend', handleMapDragEnd);
          addPointAtCoordRef.current = null;
          map.off('click', onMeasureClick);
        };
      }

      // 标绘交互内部落点逻辑 (支持触控直按与屏幕中心十字准星落点)
      const addPointInternal = (inputCoord: [number, number]): [number, number] | null => {
        let coord: [number, number] = [inputCoord[0], inputCoord[1]];
        const existingPts = drawingPointsRef.current;
        let wasSnapped = false;

        // 智能磁吸吸附
        if (enableSnappingRef.current) {
          const res = typeof map.getResolution === 'function' ? map.getResolution() : 10;
          const thresholdMeters = Math.max(10, res * 22);
          const candidates = getCandidateVertices();
          const snap = findSnapTarget(coord, candidates, thresholdMeters);
          if (snap.snapped) {
            coord = snap.snappedCoord;
            wasSnapped = true;
            onSnapFeedbackRef.current?.(true);
          }
        }

        // 多边形自动闭合判定：
        if (drawingTool === 'polygon' && existingPts.length >= 3) {
          let isCloseToFirst = false;

          if (wasSnapped && coord[0] === existingPts[0][0] && coord[1] === existingPts[0][1]) {
            isCloseToFirst = true;
          } else if (typeof map.coordinateToContainerPoint === 'function') {
            try {
              const pFirstScreen = map.coordinateToContainerPoint(
                new maptalks.Coordinate(existingPts[0][0], existingPts[0][1])
              );
              const pCurrScreen = map.coordinateToContainerPoint(
                new maptalks.Coordinate(coord[0], coord[1])
              );
              if (pFirstScreen && pCurrScreen) {
                const pixelDist = Math.hypot(pCurrScreen.x - pFirstScreen.x, pCurrScreen.y - pFirstScreen.y);
                if (pixelDist <= 26) {
                  isCloseToFirst = true;
                }
              }
            } catch (err) {}
          } else {
            const res = typeof map.getResolution === 'function' ? map.getResolution() : 5;
            const thresholdMeters = Math.max(5, res * 16);
            const distToFirst = calculateSphericalDistance(coord, existingPts[0]);
            if (distToFirst <= thresholdMeters) {
              isCloseToFirst = true;
            }
          }

          if (isCloseToFirst) {
            finishDrawing(existingPts);
            if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30);
            return coord;
          }
        }

        // 避免手抖在同一微小位置产生退化重叠边
        if (existingPts.length > 0) {
          const lastPt = existingPts[existingPts.length - 1];
          const distToLast = calculateSphericalDistance(coord, lastPt);
          const res = typeof map.getResolution === 'function' ? map.getResolution() : 5;
          if (distToLast < Math.max(0.5, res * 2.5)) {
            return null;
          }
        }

        const currentPts = [...existingPts, coord];
        drawingPointsRef.current = currentPts;
        setDrawingPoints(currentPts);
        renderPreview(currentPts, wasSnapped ? coord : undefined);

        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(25);
        }

        // 单点要素 -> 立即完成
        if (
          drawingTool &&
          (drawingTool.startsWith('post-') ||
            drawingTool.startsWith('point-') ||
            drawingTool === 'marker' ||
            drawingTool === 'text')
        ) {
          finishDrawing(currentPts);
          return coord;
        }

        // 两点要素 -> 达到2点立即完成
        if (
          drawingTool &&
          (drawingTool === 'straight-arrow' ||
            drawingTool === 'circle' ||
            drawingTool === 'sector' ||
            drawingTool === 'rectangle') &&
          currentPts.length >= 2
        ) {
          finishDrawing(currentPts);
          return coord;
        }

        // 三点要素 -> 达到3点立即完成
        if (
          drawingTool &&
          (drawingTool === 'attack-arrow' ||
            drawingTool === 'pincer-arrow' ||
            drawingTool === 'gathering-place') &&
          currentPts.length >= 3
        ) {
          finishDrawing(currentPts);
          return coord;
        }

        return coord;
      };

      addPointAtCoordRef.current = addPointInternal;

      const handleClick = (e: any) => {
        // 准星标定模式下直接点击地图不落点 (仅通过准星落点按钮或闭合标记落点)
        if (reticleModeRef.current) return;
        // 拖拽平移刚刚结束 180ms 内，丢弃抬手抖动造成的误触点击
        if (Date.now() - lastMapDragEndTime < 180) return;
        addPointInternal([e.coordinate.x, e.coordinate.y]);
      };

      /**
       * 移动指针时更新半透明预览与动态方位角
       *
       * 性能修正：原实现每个 mousemove 事件都会完整执行一遍
       *   吸附候选重算（O(要素顶点总数)）+ 拓扑自相交检测（O(n²)）
       *   + 预览层全量重建（clear 后重建十余个 GL 几何体）
       *   + setActiveSegment（每次都是新对象，触发 App 全树重渲染）。
       * mousemove 在移动端可达 60~120Hz，等于整棵树按帧率重渲染，是标绘掉帧的主因。
       *
       * 现改为节流合并：60ms 内的连续移动只提交最后一次坐标，
       * 与同文件 viewchange 的 120ms 节流策略保持一致。
       */
      const PREVIEW_THROTTLE_MS = 60;
      let lastPreviewEmit = 0;
      let previewThrottleTimer: number | null = null;
      let pendingPreviewCoord: [number, number] | null = null;

      const emitPreview = (coord: [number, number]) => {
        pendingPreviewCoord = null;
        lastPreviewEmit = Date.now();

        let mouseCoord: [number, number] = coord;
        let wasSnapped = false;

        if (enableSnappingRef.current) {
          const res = typeof map.getResolution === 'function' ? map.getResolution() : 10;
          const thresholdMeters = Math.max(10, res * 22);
          const candidates = getCandidateVertices();
          const snap = findSnapTarget(mouseCoord, candidates, thresholdMeters);
          if (snap.snapped) {
            mouseCoord = snap.snappedCoord;
            wasSnapped = true;
          }
        }

        // 磁吸状态突变捕获 (由未吸附进入已吸附)，触发微机械短震动反馈
        if (wasSnapped && !lastSnappedStateRef.current) {
          onSnapFeedbackRef.current?.(true);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(12);
          }
        }
        lastSnappedStateRef.current = wasSnapped;

        const pts = drawingPointsRef.current;
        if (pts.length > 0) {
          const tempPts: [number, number][] = [...pts, mouseCoord];
          renderPreview(tempPts, wasSnapped ? mouseCoord : undefined);

          const lastPt = pts[pts.length - 1];
          const dist = calculateSphericalDistance(lastPt, mouseCoord);
          const azimuth = calculateAzimuth(lastPt, mouseCoord);
          onActiveSegmentChangeRef.current?.({ length: dist, azimuth });
        }
      };

      const handleMouseMove = (e: any) => {
        pendingPreviewCoord = [e.coordinate.x, e.coordinate.y];
        const now = Date.now();
        const elapsed = now - lastPreviewEmit;
        if (elapsed >= PREVIEW_THROTTLE_MS) {
          if (previewThrottleTimer !== null) {
            window.clearTimeout(previewThrottleTimer);
            previewThrottleTimer = null;
          }
          emitPreview(pendingPreviewCoord);
        } else if (previewThrottleTimer === null) {
          previewThrottleTimer = window.setTimeout(() => {
            previewThrottleTimer = null;
            if (pendingPreviewCoord) emitPreview(pendingPreviewCoord);
          }, PREVIEW_THROTTLE_MS - elapsed);
        }
      };

      // 双击完成多边形/折线采集 (面要素至少需要3个点)
      const handleDblClick = (e: any) => {
        if (e.domEvent) e.domEvent.stopPropagation();
        const pts = drawingPointsRef.current;
        const minPts = drawingTool === 'polygon' ? 3 : 2;
        if (pts.length >= minPts) {
          finishDrawing(pts);
        }
      };

      // 自由手绘模式
      let isFreehandDrawing = false;
      const handleTouchStart = (e: any) => {
        if (drawingTool === 'freehand') {
          isFreehandDrawing = true;
          const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
          const pts: [number, number][] = [coord];
          drawingPointsRef.current = pts;
          setDrawingPoints(pts);
        }
      };

      const handleTouchMove = (e: any) => {
        if (drawingTool === 'freehand' && isFreehandDrawing) {
          const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
          const pts = drawingPointsRef.current;
          const last = pts[pts.length - 1];
          if (!last || calculateSphericalDistance(last, coord) > 8) {
            const newPts: [number, number][] = [...pts, coord];
            drawingPointsRef.current = newPts;
            setDrawingPoints(newPts);
            renderPreview(newPts);
          }
        }
      };

      const handleTouchEnd = () => {
        if (drawingTool === 'freehand' && isFreehandDrawing) {
          isFreehandDrawing = false;
          const pts = drawingPointsRef.current;
          if (pts.length >= 2) {
            finishDrawing(pts);
          }
        }
      };

      // 准星标定模式下，地图滑动平移时实时牵引橡皮筋预览线至屏幕中心十字准星处
      const handleReticleMapMove = () => {
        if (!reticleModeRef.current) return;
        const pts = drawingPointsRef.current;
        if (pts.length > 0) {
          const center = map.getCenter();
          if (center) {
            pendingPreviewCoord = [center.x, center.y];
            emitPreview([center.x, center.y]);
          }
        }
      };

      map.on('click', handleClick);
      map.on('mousemove', handleMouseMove);
      map.on('dblclick', handleDblClick);
      map.on('mousedown touchstart', handleTouchStart);
      map.on('touchmove mousemove', handleTouchMove);
      map.on('mouseup touchend', handleTouchEnd);
      map.on('moving viewchange', handleReticleMapMove);

      return () => {
        map.setOptions({ doubleClickZoom: prevDoubleClickZoom });
        map.off('moveend dragend animateend', handleMapDragEnd);
        map.off('moving viewchange', handleReticleMapMove);

        if (previewThrottleTimer !== null) {
          window.clearTimeout(previewThrottleTimer);
          previewThrottleTimer = null;
        }
        map.off('click', handleClick);
        map.off('mousemove', handleMouseMove);
        map.off('dblclick', handleDblClick);
        map.off('mousedown touchstart', handleTouchStart);
        map.off('touchmove mousemove', handleTouchMove);
        map.off('mouseup touchend', handleTouchEnd);
        addPointAtCoordRef.current = null;
      };
    }, [
      drawingTool,
      getCandidateVertices,
      finishDrawing,
      renderPreview,
      handleMeasureClick,
      clearDrawing,
      clearMeasure,
      drawingPointsRef,
      enableSnappingRef,
      measureToolRef,
      onActiveSegmentChangeRef,
      onSnapFeedbackRef,
      setDrawingPoints,
      mapReady,
    ]);

    return (
      <div className="w-full h-full relative select-none">
        <div ref={mapContainerRef} className="w-full h-full bg-slate-900" />

        {/* 弱网/CDN 不可达时的友好失败态
            层级置于 z-20（低于顶栏/底栏的 z-30），确保引擎异常期间应用外壳仍可见可点。 */}
        {maptalksFailed && !maptalksReady && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl px-6 text-center animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 mb-3 shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-1">MapTalks GL 核心引擎加载超时</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mb-4 leading-relaxed">
              当前网络环境可能无法访问外部 CDN 资源，请检查移动网络连接或切换 Wi-Fi 后重试。
            </p>
            <button
              onClick={() => {
                setMaptalksFailed(false);
                setMaptalksReady(false);
                // 脚本已加载失败，单纯重置状态无法重新拉取引擎，必须整页重载
                window.location.reload();
              }}
              aria-label="重新加载地图引擎"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>重新加载地图引擎</span>
            </button>
          </div>
        )}

        {/* 首次加载过渡态
            同样置于 z-20，避免引擎加载期间把顶栏与底栏一并遮住而无法操作。 */}
        {!maptalksReady && !maptalksFailed && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl text-slate-700 dark:text-gray-300">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <span className="text-xs text-slate-600 dark:text-slate-300 font-mono tracking-wider">
              正在初始化 MapTalks GL 空间渲染引擎...
            </span>
          </div>
        )}
      </div>
    );
  }
);

MaptalksContainerInner.displayName = 'MaptalksContainerInner';

/**
 * 地图容器用 React.memo 包裹。
 *
 * 该组件体量最大（1300+ 行、数十个 Hook），而 App 会在地图平移缩放时
 * 以 120ms 的节流频率重新渲染（视口中心/缩放变化）。
 * 包裹 memo 后，只要 layers / features / drawingTool 等 props 引用不变，
 * 这类与地图内部无关的父级重渲染就不会再白白执行一遍整个组件函数。
 */
export const MaptalksContainer = memo(MaptalksContainerInner);
