import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { PlotFeature, PlotLayer, PlotFeatureType, BasemapType } from '../../types';
import {
  calculateStraightArrow,
  calculateAttackArrow,
  calculatePincerArrow,
  calculateGatheringPlace,
  calculateSector,
} from '../../utils/plotAlgorithms';
import { createTacticalIcon } from '../../utils/markerIcons';
import {
  calculateSphericalDistance,
  formatDistance,
  calculateSphericalPolygonArea,
  calculateLineLength,
  formatArea,
  calculateAzimuth,
  findSnapTarget,
  checkPolygonSelfIntersection,
} from '../../utils/geoUtils';
import { Loader2 } from 'lucide-react';

export interface MaptalksContainerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  resetNorth: () => void;
  undoPoint: () => void;
  finishCurrentDrawing: () => void;
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
  onTopologyWarning?: (msg: string | null) => void;
  onActiveSegmentChange?: (segment: { length: number; azimuth: { degrees: number; text: string } } | null) => void;
  onSnapFeedback?: (snapped: boolean) => void;
}

/**
 * 构造高画质、免 API Key、零水印的生产级 GIS 底图图层
 * - dark: Esri 极夜深灰底图 (Dark Base + Dark Reference 透明道路注记)
 * - satellite: ArcGIS 全球高清遥感正射影像 + 边界道路地名注记
 * - street: Esri World Street Map 现代高清街道图 (全路网、水系、地标建筑)
 */
function createBaseMapLayer(maptalks: any, basemap: BasemapType) {
  const ts = Date.now();

  if (basemap === 'satellite') {
    if (maptalks.GroupTileLayer) {
      return new maptalks.GroupTileLayer('base-satellite-' + ts, [
        new maptalks.TileLayer('sat-img-' + ts, {
          urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          crossOrigin: 'anonymous',
          repeatWorld: true,
          maxAvailableZoom: 19,
          attribution: '&copy; Esri World Imagery & MapTalks GL',
        }),
        new maptalks.TileLayer('sat-ref-' + ts, {
          urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          crossOrigin: 'anonymous',
          repeatWorld: true,
          maxAvailableZoom: 19,
        }),
      ]);
    }
    return new maptalks.TileLayer('base-satellite-' + ts, {
      urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      crossOrigin: 'anonymous',
      repeatWorld: true,
      maxAvailableZoom: 19,
      attribution: '&copy; Esri World Imagery & MapTalks GL',
    });
  }

  if (basemap === 'street') {
    return new maptalks.TileLayer('base-street-' + ts, {
      urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      crossOrigin: 'anonymous',
      repeatWorld: true,
      maxAvailableZoom: 19,
      attribution: '&copy; Esri World Street Map & MapTalks GL',
    });
  }

  // 默认暗夜科技 (dark): Esri 极夜深灰底图 + 透明道路注记
  if (maptalks.GroupTileLayer) {
    return new maptalks.GroupTileLayer('base-dark-' + ts, [
      new maptalks.TileLayer('dark-base-' + ts, {
        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        crossOrigin: 'anonymous',
        repeatWorld: true,
        maxAvailableZoom: 19,
        attribution: '&copy; Esri Dark Canvas & MapTalks GL',
      }),
      new maptalks.TileLayer('dark-ref-' + ts, {
        urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        crossOrigin: 'anonymous',
        repeatWorld: true,
        maxAvailableZoom: 19,
      }),
    ]);
  }
  return new maptalks.TileLayer('base-dark-' + ts, {
    urlTemplate: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    crossOrigin: 'anonymous',
    repeatWorld: true,
    maxAvailableZoom: 19,
    attribution: '&copy; Esri Dark Canvas & MapTalks GL',
  });
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

    // 检测 MapTalks GL 脚本是否就绪
    const [maptalksReady, setMaptalksReady] = useState(
      typeof window !== 'undefined' && !!(window as any).maptalks
    );

    // 标绘交互中暂存的控制点
    const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
    const drawingPointsRef = useRef<[number, number][]>([]);
    drawingPointsRef.current = drawingPoints;

    const drawingToolRef = useRef(drawingTool);
    drawingToolRef.current = drawingTool;

    const activeLayerIdRef = useRef(activeLayerId);
    activeLayerIdRef.current = activeLayerId;

    const layersRef = useRef(layers);
    layersRef.current = layers;

    const featuresRef = useRef(features);
    featuresRef.current = features;

    const enableSnappingRef = useRef(enableSnapping);
    enableSnappingRef.current = enableSnapping;

    const getCandidateVertices = (): [number, number][] => {
      const visibleLayerIds = new Set(layers.filter((l) => l.visible).map((l) => l.id));
      const candidates: [number, number][] = [];
      features.forEach((feat) => {
        if (visibleLayerIds.has(feat.layerId) && feat.coordinates) {
          feat.coordinates.forEach((c) => candidates.push(c));
        }
      });
      drawingPointsRef.current.forEach((c) => candidates.push(c));
      return candidates;
    };

    // 测距暂存点
    const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
    const measurePointsRef = useRef<[number, number][]>([]);
    measurePointsRef.current = measurePoints;

    // 向上汇报当前打点数量
    useEffect(() => {
      onDrawingPointsChange?.(drawingPoints.length);
    }, [drawingPoints, onDrawingPointsChange]);

    // 精准聚焦与视口平滑居中 (支持要素对象或要素ID，自适应点/线/面/战术箭头视距)
    const focusFeatureOnMap = (feat: PlotFeature) => {
      const map = mapInstanceRef.current;
      if (!map || !feat || !feat.coordinates || feat.coordinates.length === 0) return;

      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      let sumLng = 0, sumLat = 0;
      feat.coordinates.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        sumLng += lng;
        sumLat += lat;
      });
      const centerLng = sumLng / feat.coordinates.length;
      const centerLat = sumLat / feat.coordinates.length;
      const targetCenter: [number, number] = [centerLng, centerLat];

      const spanLng = maxLng - minLng;
      const spanLat = maxLat - minLat;
      const isSinglePoint = feat.coordinates.length === 1;

      let targetZoom = 15.5;
      if (isSinglePoint) {
        targetZoom = Math.max(map.getZoom(), 16);
      } else if (spanLng > 0.08 || spanLat > 0.08) {
        targetZoom = 13.5;
      } else if (spanLng > 0.03 || spanLat > 0.03) {
        targetZoom = 14.5;
      } else {
        targetZoom = Math.max(map.getZoom(), 15.5);
      }

      map.animateTo(
        {
          center: targetCenter,
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
        const beacon = new maptalks.Marker(targetCenter, {
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

    // 暴露地图控制接口给移动端外部悬浮按钮
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
      undoPoint: () => {
        if (drawingPointsRef.current.length > 0) {
          const newPts = drawingPointsRef.current.slice(0, -1);
          drawingPointsRef.current = newPts;
          setDrawingPoints(newPts);
          renderPreview(newPts);
        }
      },
      finishCurrentDrawing: () => {
        const pts = drawingPointsRef.current;
        if (pts.length >= 2) {
          finishDrawing(pts);
        }
      },
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

    // 1. 检测 window.maptalks 注入状态
    useEffect(() => {
      if (maptalksReady) return;
      const timer = setInterval(() => {
        if (typeof window !== 'undefined' && (window as any).maptalks) {
          setMaptalksReady(true);
          clearInterval(timer);
        }
      }, 150);
      return () => clearInterval(timer);
    }, [maptalksReady]);

    // 2. 初始化 MapTalks 地图
    useEffect(() => {
      if (!maptalksReady || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return;

      const maptalks = (window as any).maptalks;

      // 创建底图切片层 (免 API Key、零水印的高清底图)
      const baseTileLayer = createBaseMapLayer(maptalks, basemap);
      baseTileLayerRef.current = baseTileLayer;

      // 创建地图实例 (初始坐标设定为中国上海市核心区: 121.4737, 31.2304)
      const map = new maptalks.Map(mapContainerRef.current, {
        center: [121.4737, 31.2304],
        zoom: 12.5,
        minZoom: 2,
        maxZoom: 19,
        baseLayer: baseTileLayer,
        spatialReference: {
          projection: 'EPSG:3857',
        },
        zoomControl: false, // 禁用原生小按钮，使用移动端大悬浮触控
        scaleControl: {
          position: 'bottom-left',
          maxWidth: 90,
        },
        doubleClickZoom: false, // 禁用双击放大，防止移动端连续点触落点时误触发缩放
        touchZoom: true,
        touchRotate: true,
      });

      // 绘制过程临时预览图层
      const previewLayer = new maptalks.VectorLayer('system-draw-preview', [], {
        zIndex: 999,
      }).addTo(map);
      previewLayerRef.current = previewLayer;

      // 测距图层
      const measureLayer = new maptalks.VectorLayer('system-measure', [], {
        zIndex: 998,
      }).addTo(map);
      measureLayerRef.current = measureLayer;

      mapInstanceRef.current = map;

      // 坐标与缩放变动监听
      map.on('mousemove touchmove', (e: any) => {
        if (onCoordinatesChange && e.coordinate) {
          onCoordinatesChange([e.coordinate.x, e.coordinate.y], map.getZoom());
        }
      });

      // 实时监听地图旋转朝向 (Bearing) 与倾角 (Pitch)
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
        if (map) {
          map.remove();
          mapInstanceRef.current = null;
        }
      };
    }, [maptalksReady]);

    // 3. 底图切换
    useEffect(() => {
      if (!mapInstanceRef.current || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      const newBaseLayer = createBaseMapLayer(maptalks, basemap);
      if (newBaseLayer) {
        mapInstanceRef.current.setBaseLayer(newBaseLayer);
        baseTileLayerRef.current = newBaseLayer;
      }
    }, [basemap]);

    // 4. 图层同步 (创建/更新/删除 MapTalks VectorLayers)
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

    // 5. 要素渲染与高亮更新
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
              // 标绘交互模式下，要素不拦截点击，直接交由底图捕获标绘顶点！
              if (drawingToolRef.current) return;
              if (e.domEvent) e.domEvent.stopPropagation();
              if (!layer.locked) {
                onSelectFeature(feat.id);
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
    }, [features, layers, selectedFeatureId, drawingTool, onSelectFeature]);

    // 6. 选中要素时聚焦 (使用 prevSelectedIdRef 避免重复触发与闭包失效)
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

    // 7. 辅助函数：构造 Geometry
    const createGeometryFromFeature = (maptalks: any, feat: PlotFeature, isSelected: boolean) => {
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
    };

    // 8. 交互标绘引擎
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;
      const previewLayer = previewLayerRef.current;
      const measureLayer = measureLayerRef.current;

      if (!drawingTool) {
        previewLayer?.clear();
        measureLayer?.clear();
        setDrawingPoints([]);
        setMeasurePoints([]);
        map.setCursor('default');
        onTopologyWarning?.(null);
        onActiveSegmentChange?.(null);
        return;
      }

      map.setCursor('crosshair');

      // 空间量算模式 (测距与测面)
      if (drawingTool === 'measure-distance' || drawingTool === 'measure-area') {
        const handleMeasureClick = (e: any) => {
          const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
          const newPts = [...measurePointsRef.current, coord];
          setMeasurePoints(newPts);

          measureLayer.clear();
          if (drawingTool === 'measure-distance' && newPts.length >= 2) {
            let totalDist = 0;
            for (let i = 0; i < newPts.length - 1; i++) {
              totalDist += calculateSphericalDistance(newPts[i], newPts[i + 1]);
            }

            const line = new maptalks.LineString(newPts, {
              symbol: {
                lineColor: '#f59e0b',
                lineWidth: 3,
                lineDasharray: [6, 4],
              },
            });
            const endMarker = new maptalks.Marker(coord, {
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
            measureLayer.addGeometry([line, endMarker]);
          } else if (drawingTool === 'measure-area' && newPts.length >= 3) {
            const area = calculateSphericalPolygonArea(newPts);
            const poly = new maptalks.Polygon([newPts], {
              symbol: {
                lineColor: '#10b981',
                lineWidth: 2.5,
                lineDasharray: [5, 5],
                polygonFill: '#10b981',
                polygonOpacity: 0.3,
              },
            });
            const centerMarker = new maptalks.Marker(coord, {
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
            measureLayer.addGeometry([poly, centerMarker]);
          }
        };

        map.on('click', handleMeasureClick);
        return () => {
          map.off('click', handleMeasureClick);
        };
      }

      // 标绘交互点击
      const handleClick = (e: any) => {
        let coord: [number, number] = [e.coordinate.x, e.coordinate.y];
        const existingPts = drawingPointsRef.current;
        let wasSnapped = false;

        // 智能磁吸吸附 (Smart Vertex Snapping)
        if (enableSnappingRef.current) {
          const res = typeof map.getResolution === 'function' ? map.getResolution() : 10;
          const thresholdMeters = Math.max(10, res * 22);
          const candidates = getCandidateVertices();
          const snap = findSnapTarget(coord, candidates, thresholdMeters);
          if (snap.snapped) {
            coord = snap.snappedCoord;
            wasSnapped = true;
            onSnapFeedback?.(true);
          }
        }

        // 多边形采集：当已有3个及以上顶点，若再次点击靠近起点，自动闭合完成！
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

      // 移动端拖动/指针移动时更新半透明预览与动态方位角
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
        if (pts.length === 0) return;

        const previewPts = [...pts, mouseCoord];
        renderPreview(previewPts, wasSnapped ? mouseCoord : undefined);

        // 实时报告当前边段长度与真北方位角
        const lastPt = pts[pts.length - 1];
        const segDist = calculateSphericalDistance(lastPt, mouseCoord);
        const az = calculateAzimuth(lastPt, mouseCoord);
        onActiveSegmentChange?.({ length: segDist, azimuth: az });
      };

      // 双击完成
      const handleDblClick = () => {
        const pts = drawingPointsRef.current;
        if ((drawingTool === 'polyline' || drawingTool === 'polygon' || drawingTool === 'freehand') && pts.length >= 2) {
          finishDrawing(pts);
        }
      };

      map.on('click', handleClick);
      map.on('mousemove', handleMouseMove);
      map.on('dblclick', handleDblClick);

      return () => {
        map.off('click', handleClick);
        map.off('mousemove', handleMouseMove);
        map.off('dblclick', handleDblClick);
        onTopologyWarning?.(null);
        onActiveSegmentChange?.(null);
      };
    }, [drawingTool]);

    // 完成标绘并落库
    const finishDrawing = (pts: [number, number][]) => {
      if (!drawingTool || pts.length === 0) return;
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

      onCreateFeature(newFeature);
      setDrawingPoints([]);
      onTopologyWarning?.(null);
      onActiveSegmentChange?.(null);
      onCancelDrawing();
    };

    // 渲染半透明预览
    const renderPreview = (pts: [number, number][], snappedCoord?: [number, number]) => {
      const previewLayer = previewLayerRef.current;
      if (!previewLayer || !(window as any).maptalks || !drawingTool) return;
      const maptalks = (window as any).maptalks;

      previewLayer.clear();
      if (pts.length === 0) return;

      // 拓扑自相交校验 (多边形简单几何拓扑完整性)
      let hasTopoError = false;
      if (drawingTool === 'polygon' && pts.length >= 4) {
        const topo = checkPolygonSelfIntersection(pts);
        if (topo.hasIntersection) {
          hasTopoError = true;
          onTopologyWarning?.(topo.message || '⚠️ 存在边线自相交 (不符合GIS拓扑规范)');
        } else {
          onTopologyWarning?.(null);
        }
      } else {
        onTopologyWarning?.(null);
      }

      const symbol = {
        lineColor: hasTopoError ? '#ef4444' : '#f59e0b',
        lineWidth: hasTopoError ? 3 : 2.5,
        lineDasharray: hasTopoError ? [4, 4] : [6, 4],
        polygonFill: hasTopoError ? '#ef4444' : '#f59e0b',
        polygonOpacity: hasTopoError ? 0.35 : 0.28,
      };

      // 1. 在每个已采集的控制顶点处绘制醒目的序号标定圆点，解决移动端落点无感知问题
      pts.forEach((pt, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === pts.length - 1;
        const vertexMarker = new maptalks.Marker(pt, {
          symbol: [
            {
              markerType: 'ellipse',
              markerWidth: isFirst ? 18 : 14,
              markerHeight: isFirst ? 18 : 14,
              markerFill: isFirst ? '#10b981' : isLast ? '#3b82f6' : '#f59e0b',
              markerLineColor: '#ffffff',
              markerLineWidth: 2,
              markerFillOpacity: 0.95,
            },
            {
              textName: isFirst ? '起点' : `#${idx + 1}`,
              textSize: 10,
              textFill: '#ffffff',
              textHaloFill: '#0b1120',
              textHaloRadius: 2.5,
              textDy: -15,
              textWeight: 'bold',
            },
          ],
        });
        previewLayer.addGeometry(vertexMarker);
      });

      // 2. 磁吸吸附光圈标定反馈 (CAD / GIS 级磁吸吸附)
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

      // 3. 线段方位角与实时长度动态注记 (CAD / GIS 级工程注记)
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

      // 2. 几何图元半透明引导预览
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
          } else {
            previewLayer.addGeometry(new maptalks.LineString(pts, { symbol: { lineColor: '#f59e0b', lineWidth: 2, lineDasharray: [5, 5] } }));
          }
        }
      } else if (drawingTool === 'pincer-arrow') {
        if (pts.length >= 2) {
          const pincerCoords = calculatePincerArrow(pts);
          if (pincerCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([pincerCoords], { symbol }));
          } else {
            previewLayer.addGeometry(new maptalks.LineString(pts, { symbol: { lineColor: '#f59e0b', lineWidth: 2, lineDasharray: [5, 5] } }));
          }
        }
      } else if (drawingTool === 'gathering-place') {
        if (pts.length >= 2) {
          const gatherCoords = calculateGatheringPlace(pts);
          if (gatherCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([gatherCoords], { symbol }));
          } else {
            previewLayer.addGeometry(new maptalks.LineString(pts, { symbol: { lineColor: '#f59e0b', lineWidth: 2, lineDasharray: [5, 5] } }));
          }
        }
      } else if (drawingTool === 'sector') {
        if (pts.length >= 2) {
          const sectorCoords = calculateSector(pts[0], pts[1], 90);
          if (sectorCoords.length >= 3) {
            previewLayer.addGeometry(new maptalks.Polygon([sectorCoords], { symbol }));
          }
        }
      } else if (drawingTool === 'polyline' || drawingTool === 'freehand') {
        if (pts.length >= 2) {
          previewLayer.addGeometry(new maptalks.LineString(pts, { symbol }));
        }
      } else if (drawingTool === 'polygon') {
        if (pts.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([pts], { symbol }));
        } else if (pts.length === 2) {
          previewLayer.addGeometry(new maptalks.LineString(pts, { symbol: { lineColor: '#f59e0b', lineWidth: 2, lineDasharray: [5, 5] } }));
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
      } else if (drawingTool === 'circle') {
        if (pts.length >= 2) {
          const r = calculateSphericalDistance(pts[0], pts[1]);
          previewLayer.addGeometry(new maptalks.Circle(pts[0], r, { symbol }));
        }
      }
    };

    return (
      <div className="relative w-full h-full flex-1 overflow-hidden">
        {/* 脚本加载等待遮罩 */}
        {!maptalksReady && (
          <div className="absolute inset-0 z-40 bg-slate-100 dark:bg-gray-950 flex flex-col items-center justify-center gap-3 text-slate-700 dark:text-gray-300">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <div className="text-xs font-medium">正在加载 MapTalks GL 移动端引擎...</div>
            <div className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">https://maptalks.com/api/maptalks-gl.js</div>
          </div>
        )}

        {/* MapTalks 挂载容器 */}
        <div ref={mapContainerRef} className="w-full h-full bg-slate-100 dark:bg-gray-950" />
      </div>
    );
  }
);
