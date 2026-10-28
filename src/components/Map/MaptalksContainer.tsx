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
import { calculateSphericalDistance, formatDistance } from '../../utils/geoUtils';
import { Loader2 } from 'lucide-react';

export interface MaptalksContainerRef {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  undoPoint: () => void;
  finishCurrentDrawing: () => void;
}

interface MaptalksContainerProps {
  layers: PlotLayer[];
  features: PlotFeature[];
  activeLayerId: string;
  selectedFeatureId: string | null;
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  basemap: BasemapType;
  onSelectFeature: (featureId: string | null) => void;
  onCreateFeature: (feature: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancelDrawing: () => void;
  onCoordinatesChange?: (coords: [number, number], zoom: number) => void;
  onDrawingPointsChange?: (count: number) => void;
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
      onSelectFeature,
      onCreateFeature,
      onCancelDrawing,
      onCoordinatesChange,
      onDrawingPointsChange,
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

    // 测距暂存点
    const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
    const measurePointsRef = useRef<[number, number][]>([]);
    measurePointsRef.current = measurePoints;

    // 向上汇报当前打点数量
    useEffect(() => {
      onDrawingPointsChange?.(drawingPoints.length);
    }, [drawingPoints, onDrawingPointsChange]);

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
            center: [120.15, 30.28],
            zoom: 12,
            pitch: 0,
            bearing: 0,
          },
          { duration: 500 }
        );
      },
      undoPoint: () => {
        if (drawingPointsRef.current.length > 0) {
          const newPts = drawingPointsRef.current.slice(0, -1);
          setDrawingPoints(newPts);
          renderPreview(newPts);
        }
      },
      finishCurrentDrawing: () => {
        if (drawingPointsRef.current.length >= 2) {
          finishDrawing(drawingPointsRef.current);
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

      // 创建底图切片层
      let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      let subdomains = ['a', 'b', 'c', 'd'];

      if (basemap === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        subdomains = [];
      } else if (basemap === 'street') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
        subdomains = ['a', 'b', 'c', 'd'];
      }

      const baseTileLayer = new maptalks.TileLayer('base-tiles', {
        urlTemplate: tileUrl,
        subdomains: subdomains.length > 0 ? subdomains : undefined,
        attribution: '&copy; GeoPlot Studio & MapTalks GL',
      });
      baseTileLayerRef.current = baseTileLayer;

      // 创建地图实例 (MapTalks GL 移动端优化)
      const map = new maptalks.Map(mapContainerRef.current, {
        center: [120.15, 30.28],
        zoom: 12,
        minZoom: 3,
        maxZoom: 18,
        baseLayer: baseTileLayer,
        spatialReference: {
          projection: 'EPSG:3857',
        },
        zoomControl: false, // 禁用原生小按钮，使用移动端大悬浮触控
        scaleControl: {
          position: 'bottom-left',
          maxWidth: 90,
        },
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

      let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
      let subdomains = ['a', 'b', 'c', 'd'];

      if (basemap === 'satellite') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        subdomains = [];
      } else if (basemap === 'street') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png';
        subdomains = ['a', 'b', 'c', 'd'];
      } else if (basemap === 'grid') {
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png';
        subdomains = ['a', 'b', 'c', 'd'];
      }

      const newBaseLayer = new maptalks.TileLayer('base-tiles-' + Date.now(), {
        urlTemplate: tileUrl,
        subdomains: subdomains.length > 0 ? subdomains : undefined,
      });

      mapInstanceRef.current.setBaseLayer(newBaseLayer);
      baseTileLayerRef.current = newBaseLayer;
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

    // 6. 选中要素时聚焦
    useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !selectedFeatureId) return;

      const feat = features.find((f) => f.id === selectedFeatureId);
      if (feat && feat.coordinates && feat.coordinates.length > 0) {
        const targetCoord = feat.coordinates[0];
        map.animateTo(
          {
            center: targetCoord,
          },
          {
            duration: 400,
          }
        );
      }
    }, [selectedFeatureId]);

    // 7. 辅助函数：构造 Geometry
    const createGeometryFromFeature = (maptalks: any, feat: PlotFeature, isSelected: boolean) => {
      const { type, coordinates, properties } = feat;
      if (!coordinates || coordinates.length === 0) return null;

      const strokeColor = isSelected ? '#fbbf24' : properties.strokeColor;
      const strokeWidth = isSelected ? properties.strokeWidth + 2 : properties.strokeWidth;
      const dash = properties.strokeDasharray === 'dash' ? [8, 6] : null;

      // 战术点标号
      if (type.startsWith('post-')) {
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
        return new maptalks.Marker(coordinates[0], {
          id: feat.id,
          symbol: {
            markerType: 'pin',
            markerFill: strokeColor,
            markerLineColor: '#ffffff',
            markerLineWidth: 1.5,
            markerWidth: isSelected ? 32 : 26,
            markerHeight: isSelected ? 40 : 34,
            textName: feat.name,
            textSize: 12,
            textFill: '#ffffff',
            textHaloFill: '#000000',
            textHaloRadius: 2,
            textDy: 18,
          },
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
        return;
      }

      map.setCursor('crosshair');

      // 测距模式
      if (drawingTool === 'measure-distance') {
        const handleMeasureClick = (e: any) => {
          const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
          const newPts = [...measurePointsRef.current, coord];
          setMeasurePoints(newPts);

          measureLayer.clear();
          if (newPts.length >= 2) {
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
                textName: `距: ${formatDistance(totalDist)}`,
                textSize: 12,
                textFill: '#fbbf24',
                textHaloFill: '#111827',
                textHaloRadius: 3,
                textDy: -15,
              },
            });
            measureLayer.addGeometry([line, endMarker]);
          }
        };

        map.on('click', handleMeasureClick);
        return () => {
          map.off('click', handleMeasureClick);
        };
      }

      // 标绘交互点击
      const handleClick = (e: any) => {
        const coord: [number, number] = [e.coordinate.x, e.coordinate.y];
        const currentPts = [...drawingPointsRef.current, coord];
        setDrawingPoints(currentPts);

        // 单点要素
        if (drawingTool.startsWith('post-') || drawingTool === 'marker' || drawingTool === 'text') {
          finishDrawing(currentPts);
          return;
        }

        // 两点要素
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

        // 三点要素
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

      // 移动端拖动/指针移动时更新半透明预览
      const handleMouseMove = (e: any) => {
        const mouseCoord: [number, number] = [e.coordinate.x, e.coordinate.y];
        const pts = drawingPointsRef.current;
        if (pts.length === 0) return;

        const previewPts = [...pts, mouseCoord];
        renderPreview(previewPts);
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
      };
    }, [drawingTool]);

    // 完成标绘并落库
    const finishDrawing = (pts: [number, number][]) => {
      if (!drawingTool || pts.length === 0) return;
      previewLayerRef.current?.clear();

      const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
      const themeColor = activeLayer?.color || '#3b82f6';

      const defaultNames: Record<string, string> = {
        'straight-arrow': '进攻指向指示',
        'attack-arrow': '主力突击突穿箭头',
        'pincer-arrow': '钳形合围进攻箭头',
        'gathering-place': '战役集结地域',
        'sector': '预警探测扇形区',
        'polyline': '机动行军路线',
        'polygon': '战术控制地域',
        'rectangle': '网格搜索区',
        'circle': '核心警戒防区',
        'marker': '战术观察标定点',
        'text': '态势重点注记',
        'post-command': '基本指挥所',
        'post-radar': '雷达探测站',
        'post-danger': '威胁障碍区',
        'post-rescue': '野战医疗站',
        'post-airport': '战备机场',
        'post-depot': '战备物资库',
      };

      const newFeature: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'> = {
        name: `${defaultNames[drawingTool] || '标绘要素'}_${Date.now().toString().slice(-4)}`,
        type: drawingTool as PlotFeatureType,
        layerId: activeLayerId,
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
        },
      };

      onCreateFeature(newFeature);
      setDrawingPoints([]);
      onCancelDrawing();
    };

    // 渲染半透明预览
    const renderPreview = (pts: [number, number][]) => {
      const previewLayer = previewLayerRef.current;
      if (!previewLayer || !(window as any).maptalks) return;
      const maptalks = (window as any).maptalks;

      previewLayer.clear();
      const symbol = {
        lineColor: '#f59e0b',
        lineWidth: 2,
        lineDasharray: [5, 5],
        polygonFill: '#f59e0b',
        polygonOpacity: 0.25,
      };

      if (drawingTool === 'straight-arrow') {
        const arrowCoords = calculateStraightArrow(pts);
        if (arrowCoords.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([arrowCoords], { symbol }));
        }
      } else if (drawingTool === 'attack-arrow') {
        const arrowCoords = calculateAttackArrow(pts);
        if (arrowCoords.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([arrowCoords], { symbol }));
        }
      } else if (drawingTool === 'pincer-arrow') {
        const pincerCoords = calculatePincerArrow(pts);
        if (pincerCoords.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([pincerCoords], { symbol }));
        }
      } else if (drawingTool === 'gathering-place') {
        const gatherCoords = calculateGatheringPlace(pts);
        if (gatherCoords.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([gatherCoords], { symbol }));
        }
      } else if (drawingTool === 'sector') {
        const sectorCoords = calculateSector(pts[0], pts[1], 90);
        if (sectorCoords.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([sectorCoords], { symbol }));
        }
      } else if (drawingTool === 'polyline' || drawingTool === 'freehand') {
        previewLayer.addGeometry(new maptalks.LineString(pts, { symbol }));
      } else if (drawingTool === 'polygon') {
        if (pts.length >= 3) {
          previewLayer.addGeometry(new maptalks.Polygon([pts], { symbol }));
        }
      } else if (drawingTool === 'rectangle') {
        if (pts.length >= 2) {
          const [p1, p2] = pts;
          const rectCoords = [
            [p1[0], p1[1]],
            [p2[0], p1[1]],
            [p2[0], p2[1]],
            [p1[0], p2[1]],
          ];
          previewLayer.addGeometry(new maptalks.Polygon([rectCoords], { symbol }));
        }
      } else if (drawingTool === 'circle') {
        const r = calculateSphericalDistance(pts[0], pts[1]);
        previewLayer.addGeometry(new maptalks.Circle(pts[0], r, { symbol }));
      }
    };

    return (
      <div className="relative w-full h-full flex-1 overflow-hidden">
        {/* 脚本加载等待遮罩 */}
        {!maptalksReady && (
          <div className="absolute inset-0 z-40 bg-gray-950 flex flex-col items-center justify-center gap-3 text-gray-300">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <div className="text-xs font-medium">正在加载 MapTalks GL 移动端引擎...</div>
            <div className="text-[10px] text-gray-500 font-mono">https://maptalks.com/api/maptalks-gl.js</div>
          </div>
        )}

        {/* MapTalks 挂载容器 */}
        <div ref={mapContainerRef} className="w-full h-full bg-gray-950" />
      </div>
    );
  }
);
