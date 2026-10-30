import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
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
}

export const MaptalksContainer = forwardRef<MaptalksContainerRef, MaptalksContainerProps>(
  (
    {
      layers,
      features,
      activeLayerId,
      selectedFeatureId,
      drawingTool,
      basemap,
      enableSnapping = true,
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

    const activeLayerIdRef = useRef(activeLayerId);
    activeLayerIdRef.current = activeLayerId;

    const layersRef = useRef(layers);
    layersRef.current = layers;

    const featuresRef = useRef(features);
    featuresRef.current = features;

    const enableSnappingRef = useRef(enableSnapping);
    enableSnappingRef.current = enableSnapping;

    const onSelectFeatureRef = useRef(onSelectFeature);
    onSelectFeatureRef.current = onSelectFeature;

    const onActiveSegmentChangeRef = useRef(onActiveSegmentChange);
    onActiveSegmentChangeRef.current = onActiveSegmentChange;

    const onSnapFeedbackRef = useRef(onSnapFeedback);
    onSnapFeedbackRef.current = onSnapFeedback;

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

      // 坐标与缩放变动监听
      map.on('mousemove touchmove', (e: any) => {
        if (onCoordinatesChange && e.coordinate) {
          onCoordinatesChange([e.coordinate.x, e.coordinate.y], map.getZoom());
        }
      });

      // 监听地图旋转朝向 (Bearing) 与倾角 (Pitch)
      const handleMapTransform = () => {
        if (!map) return;
        const b = typeof map.getBearing === 'function' ? map.getBearing() : 0;
        const p = typeof map.getPitch === 'function' ? map.getPitch() : 0;
        onBearingChange?.(b, p);
      };

      map.on('rotate pitch viewchange moveend animateend zoomend', handleMapTransform);
      handleMapTransform();

      // 点击空白处取消要素选中
      map.on('click', (e: any) => {
        if (!drawingTool && e.target === map) {
          onSelectFeature(null);
        }
      });

      return () => {
        window.clearTimeout(resizeTimer);
        if (resizeObserver) {
          resizeObserver.disconnect();
          resizeObserver = null;
        }
        if (map) {
          map.remove();
          mapInstanceRef.current = null;
        }
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
    }, [basemap]);

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
    }, [layers]);

    // 要素渲染与高亮更新
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      layers.forEach((layer) => {
        const vecLayer = map.getLayer(layer.id);
        if (!vecLayer) return;

        vecLayer.clear();
        const layerFeatures = features.filter((f) => f.layerId === layer.id);

        layerFeatures.forEach((feat) => {
          const isSelected = feat.id === selectedFeatureId;
          const geom = createGeometryFromFeature(maptalks, feat, isSelected);

          if (geom) {
            geom.on('click tap', (e: any) => {
              if (drawingTool) return;
              if (e.domEvent) e.domEvent.stopPropagation();
              if (!layer.locked) {
                onSelectFeatureRef.current(feat.id);
              }
            });

            geom.on('mouseover', () => {
              if (!drawingTool) {
                map.setCursor('pointer');
              }
            });
            geom.on('mouseout', () => {
              if (!drawingTool) {
                map.setCursor('default');
              }
            });

            vecLayer.addGeometry(geom);
          }
        });
      });
    }, [features, layers, selectedFeatureId, drawingTool]);

    // 选中要素时聚焦
    const prevSelectedIdRef = useRef<string | null>(null);
    useEffect(() => {
      if (!selectedFeatureId) {
        prevSelectedIdRef.current = null;
        return;
      }
      if (prevSelectedIdRef.current !== selectedFeatureId) {
        prevSelectedIdRef.current = selectedFeatureId;
        const feat = features.find((f) => f.id === selectedFeatureId);
        if (feat) {
          focusFeatureOnMap(feat);
        }
      }
    }, [selectedFeatureId, features]);

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

      // 空间量算模式 (测距与测面)
      if (drawingTool === 'measure-distance' || drawingTool === 'measure-area') {
        if (measureToolRef.current !== drawingTool) {
          measureToolRef.current = drawingTool;
          clearMeasure();
        }

        const onMeasureClick = (e: any) => {
          const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
          handleMeasureClick(coord, drawingTool, maptalks);
        };

        map.on('click', onMeasureClick);
        return () => {
          map.off('click', onMeasureClick);
        };
      }

      // 标绘交互点击
      const handleClick = (e: any) => {
        let coord: [number, number] = [e.coordinate.x, e.coordinate.y];
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

        // 多边形自动闭合
        if (drawingTool === 'polygon' && existingPts.length >= 3) {
          const distToFirst = calculateSphericalDistance(coord, existingPts[0]);
          const zoom = map.getZoom();
          const threshold = Math.max(30, 20000 / Math.pow(2, zoom - 10));
          if (distToFirst <= threshold) {
            finishDrawing(existingPts);
            return;
          }
        }

        const currentPts = [...existingPts, coord];
        drawingPointsRef.current = currentPts;
        setDrawingPoints(currentPts);
        renderPreview(currentPts, wasSnapped ? coord : undefined);

        // 单点要素 -> 立即完成
        if (
          drawingTool.startsWith('post-') ||
          drawingTool.startsWith('point-') ||
          drawingTool === 'marker' ||
          drawingTool === 'text'
        ) {
          finishDrawing(currentPts);
          return;
        }

        // 两点要素 -> 达到2点立即完成
        if (
          (drawingTool === 'straight-arrow' ||
            drawingTool === 'circle' ||
            drawingTool === 'sector' ||
            drawingTool === 'rectangle') &&
          currentPts.length >= 2
        ) {
          finishDrawing(currentPts);
          return;
        }

        // 三点要素 -> 达到3点立即完成
        if (
          (drawingTool === 'attack-arrow' ||
            drawingTool === 'pincer-arrow' ||
            drawingTool === 'gathering-place') &&
          currentPts.length >= 3
        ) {
          finishDrawing(currentPts);
          return;
        }
      };

      // 移动指针时更新半透明预览与动态方位角
      const handleMouseMove = (e: any) => {
        let mouseCoord: [number, number] = [e.coordinate.x, e.coordinate.y];
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

      // 双击完成多边形/折线采集
      const handleDblClick = (e: any) => {
        if (e.domEvent) e.domEvent.stopPropagation();
        const pts = drawingPointsRef.current;
        if (pts.length >= 2) {
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

      map.on('click', handleClick);
      map.on('mousemove', handleMouseMove);
      map.on('dblclick', handleDblClick);
      map.on('mousedown touchstart', handleTouchStart);
      map.on('touchmove mousemove', handleTouchMove);
      map.on('mouseup touchend', handleTouchEnd);

      return () => {
        map.off('click', handleClick);
        map.off('mousemove', handleMouseMove);
        map.off('dblclick', handleDblClick);
        map.off('mousedown touchstart', handleTouchStart);
        map.off('touchmove mousemove', handleTouchMove);
        map.off('mouseup touchend', handleTouchEnd);
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

MaptalksContainer.displayName = 'MaptalksContainer';
