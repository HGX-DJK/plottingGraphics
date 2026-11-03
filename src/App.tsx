import React, { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { User, PlotFeatureType, BasemapType, PlotFeature } from './types';
import { authService } from './services/authService';
import {
  storageService,
  setStorageErrorHandler,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from './services/storageService';
import {
  MaptalksContainer,
  MaptalksContainerRef,
  MeasureResult,
} from './components/Map/MaptalksContainer';
import { MobileHeader } from './components/Mobile/MobileHeader';
import { MobileTabBar, MobileTab } from './components/Mobile/MobileTabBar';
import { MobilePlottingSheet } from './components/Mobile/MobilePlottingSheet';
import { MobileLayerSheet } from './components/Mobile/MobileLayerSheet';
import { MobileFeatureListSheet } from './components/Mobile/MobileFeatureListSheet';
import { MobilePropertySheet } from './components/Mobile/MobilePropertySheet';
import { MobileMoreSheet } from './components/Mobile/MobileMoreSheet';
import { MobileDrawingControls } from './components/Mobile/MobileDrawingControls';
import { MobileFeatureQuickCard } from './components/Mobile/MobileFeatureQuickCard';
import { MobileLoginView } from './components/Mobile/MobileLoginView';
import { AmapPoiItem } from './services/amapSearchService';

/**
 * 代码分割：以下组件属于低频功能（POI 检索 / 导入导出 / 新建图层 / 清空确认 / 成果图预览），
 * 按需异步加载，避免首屏把全部逻辑打进主包（移动端首屏时间与流量双优化）。
 * 这些模块均为具名导出，故需显式映射为 default 以满足 React.lazy 的签名。
 */
const MobilePoiSearchSheet = React.lazy(() =>
  import('./components/Mobile/MobilePoiSearchSheet').then((m) => ({ default: m.MobilePoiSearchSheet }))
);
const NewLayerModal = React.lazy(() =>
  import('./components/Modals/NewLayerModal').then((m) => ({ default: m.NewLayerModal }))
);
const ImportExportModal = React.lazy(() =>
  import('./components/Modals/ImportExportModal').then((m) => ({ default: m.ImportExportModal }))
);
const ClearFeaturesModal = React.lazy(() =>
  import('./components/Modals/ClearFeaturesModal').then((m) => ({ default: m.ClearFeaturesModal }))
);
const ExportImageModal = React.lazy(() =>
  import('./components/Modals/ExportImageModal').then((m) => ({ default: m.ExportImageModal }))
);
const BufferModal = React.lazy(() =>
  import('./components/Modals/BufferModal').then((m) => ({ default: m.BufferModal }))
);
import {
  Smartphone,
  Monitor,
  Move,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  CoordinateFormat,
  formatCoordinates,
  calculateLineLength,
  calculateSphericalPolygonArea,
} from './utils/geoUtils';
import { ThemeMode, themeService } from './services/themeService';
import { copyToClipboard } from './utils/uiUtils';
import { useToast } from './hooks/useToast';
import { useLayers } from './hooks/useLayers';
import { useFeatures } from './hooks/useFeatures';

export const App: React.FC = () => {
  const mapRef = useRef<MaptalksContainerRef>(null);

  // 1. 全局轻量 Toast 反馈
  const { toastMessage, toastAction, setToastAction, showToast } = useToast();

  /**
   * 存储异常（隐私模式禁用本地存储 / 配额写满）转 Toast 提示。
   *
   * 早期实现里写入失败只写 console，用户看到「已保存」实则数据已经丢失。
   */
  useEffect(() => {
    setStorageErrorHandler((message) => showToast(message));
    return () => setStorageErrorHandler(null);
  }, [showToast]);

  // 2. 全局明暗风格主题管理
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.initTheme());
  const [basemap, setBasemap] = useState<BasemapType>(() =>
    themeService.getTheme() === 'light' ? 'street' : 'dark'
  );

  const handleToggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    themeService.setTheme(next);
    if (next === 'light' && basemap === 'dark') {
      setBasemap('street');
    } else if (next === 'dark' && basemap === 'street') {
      setBasemap('dark');
    }
  }, [theme, basemap]);

  const handleSelectTheme = useCallback((newTheme: ThemeMode) => {
    setTheme(newTheme);
    themeService.setTheme(newTheme);
    if (newTheme === 'light' && basemap === 'dark') {
      setBasemap('street');
    } else if (newTheme === 'dark' && basemap === 'street') {
      setBasemap('dark');
    }
  }, [basemap]);

  // 3. 用户会话管理
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    authService.getCurrentUser()
  );

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const handleLogout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    setActiveTab(null);
  }, []);

  // 4. 核心图层状态管理 Hook
  const {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    activeLayer,
    handleSelectActiveLayer,
    handleShowOnlyActiveLayer,
    handleShowAllLayers,
    handleCreateLayer,
    handleToggleLayerVisibility,
    handleToggleLayerLock,
    handleChangeLayerOpacity,
    handleDeleteLayer,
    ensureLayerVisible,
    resetLayers,
  } = useLayers({
    onNotify: showToast,
    onCascadeDeleteFeatures: (layerId) => handleCascadeDeleteByLayer(layerId),
  });

  // 5. 核心要素状态管理 Hook
  const {
    features,
    setFeatures,
    selectedFeatureId,
    setSelectedFeatureId,
    selectedFeature,
    handleCreateFeature,
    handleUpdateFeature,
    handleDeleteFeature,
    handleClearFeatures,
    handleCascadeDeleteByLayer,
    handleLocateFeature: locateFeatureHook,
    resetFeatures,
  } = useFeatures({
    onNotify: showToast,
    layers,
    onEnsureLayerVisible: ensureLayerVisible,
    onSelectActiveLayer: handleSelectActiveLayer,
  });

  // 定位要素便捷委托
  const handleLocateFeature = useCallback(
    (featureId: string) => {
      locateFeatureHook(
        featureId,
        (feat) => mapRef.current?.focusFeature(feat),
        () => setActiveTab(null)
      );
    },
    [locateFeatureHook]
  );

  // 6. 移动端 Tab 与交互状态
  const [activeTab, setActiveTab] = useState<MobileTab>(null);
  const [drawingTool, setDrawingTool] = useState<
    PlotFeatureType | 'measure-distance' | 'measure-area' | null
  >(null);
  const [drawingPointsCount, setDrawingPointsCount] = useState<number>(0);
  const [measureResult, setMeasureResult] = useState<MeasureResult | null>(null);
  const [cursorCoords, setCursorCoords] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_MAP_ZOOM);
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>('DD');
  const [bearing, setBearing] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [enableSnapping, setEnableSnapping] = useState<boolean>(true);
  const [topologyWarning, setTopologyWarning] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<{
    length: number;
    azimuth: { degrees: number; text: string };
  } | null>(null);

  const handleCycleCoordinateFormat = () => {
    setCoordinateFormat((prev) => {
      if (prev === 'DD') return 'DMS';
      if (prev === 'DMS') return 'MERCATOR';
      return 'DD';
    });
  };

  const handleCopyCoordinates = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = formatCoordinates(cursorCoords, coordinateFormat, 6);
    const ok = await copyToClipboard(text);
    showToast(ok ? `✓ 已复制精确坐标: ${text}` : '复制失败，请检查浏览器剪贴板权限');
  };

  // 7. 模态弹窗状态
  const [isNewLayerModalOpen, setIsNewLayerModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // 空间缓冲区分析弹窗状态
  const [bufferTargetFeature, setBufferTargetFeature] = useState<PlotFeature | null>(null);
  const handleOpenBufferModal = useCallback((feat: PlotFeature) => {
    setBufferTargetFeature(feat);
  }, []);
  const handleCloseBufferModal = useCallback(() => {
    setBufferTargetFeature(null);
  }, []);

  // 准星中心落点触发
  const handleAddCenterPoint = useCallback(() => {
    mapRef.current?.addPointAtCenter();
  }, []);

  // 8. 顶点二次拖拽修改与重定位状态 (解决画错拐点必须整图删掉重画痛点)
  const [editingFeature, setEditingFeature] = useState<PlotFeature | null>(null);
  const [editingCoords, setEditingCoords] = useState<[number, number][]>([]);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number>(0);
  const [nudgeStep, setNudgeStep] = useState<number>(5); // 0.5m / 1m / 5m / 20m 步长

  const handleStartVertexEdit = useCallback(
    (feat: PlotFeature) => {
      if (!feat.coordinates || feat.coordinates.length === 0) {
        showToast('该要素无有效坐标，无法微调顶点');
        return;
      }
      setEditingFeature(feat);
      setEditingCoords(feat.coordinates);
      setSelectedVertexIndex(0);
      setSelectedFeatureId(null);
      setActiveTab(null);
      mapRef.current?.startVertexEdit(
        feat.id,
        (newCoords) => {
          setEditingCoords(newCoords);
        },
        (idx) => {
          setSelectedVertexIndex(idx);
        }
      );
      showToast(`已进入「${feat.name}」微调模式：点击地图或方向键可直接移动拐点`);
    },
    [showToast, setSelectedFeatureId]
  );

  const handleSelectVertex = useCallback((idx: number) => {
    setSelectedVertexIndex(idx);
    mapRef.current?.selectVertex(idx);
  }, []);

  const handleNudgeVertex = useCallback((dxMeters: number, dyMeters: number) => {
    mapRef.current?.nudgeSelectedVertex(dxMeters, dyMeters);
  }, []);

  const handleInsertVertex = useCallback(() => {
    mapRef.current?.insertVertex(selectedVertexIndex);
  }, [selectedVertexIndex]);

  const handleDeleteVertex = useCallback(() => {
    mapRef.current?.deleteVertex(selectedVertexIndex);
  }, [selectedVertexIndex]);

  const handleCycleNudgeStep = useCallback(() => {
    setNudgeStep((prev) => (prev === 1 ? 5 : prev === 5 ? 20 : prev === 20 ? 0.5 : 1));
  }, []);

  const handleSaveVertexEdit = useCallback(() => {
    if (!editingFeature) return;

    let calculatedLength: number | undefined;
    let calculatedArea: number | undefined;

    if (editingFeature.type === 'polyline' || editingFeature.type === 'freehand') {
      calculatedLength = calculateLineLength(editingCoords);
    } else if (editingFeature.type === 'polygon' || editingFeature.type === 'rectangle') {
      calculatedArea = calculateSphericalPolygonArea(editingCoords);
      calculatedLength = calculateLineLength(editingCoords);
    }

    const updated: PlotFeature = {
      ...editingFeature,
      coordinates: editingCoords,
      properties: {
        ...editingFeature.properties,
        ...(calculatedLength !== undefined ? { calculatedLength } : {}),
        ...(calculatedArea !== undefined ? { calculatedArea } : {}),
      },
      updatedAt: Date.now(),
    };

    handleUpdateFeature(updated);
    mapRef.current?.stopVertexEdit();
    setEditingFeature(null);
    showToast(`✓ 已成功保存「${editingFeature.name}」的顶点修改`);
  }, [editingFeature, editingCoords, handleUpdateFeature, showToast]);

  const handleCancelVertexEdit = useCallback(() => {
    if (!editingFeature) return;
    mapRef.current?.stopVertexEdit();
    handleUpdateFeature(editingFeature); // 恢复原状
    setEditingFeature(null);
    showToast('已取消顶点微调');
  }, [editingFeature, handleUpdateFeature, showToast]);

  // 9. 高清标绘成果图生成导出状态 (解决领导汇报截屏杂乱痛点)
  const [isExportImageModalOpen, setIsExportImageModalOpen] = useState(false);
  const [exportImageDataUrl, setExportImageDataUrl] = useState<string | null>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);

  /**
   * 成果图导出所需的元数据快照。
   *
   * 早期实现把 cursorCoords / zoomLevel / features.length 直接放进
   * handleOpenExportPoster 的依赖数组，于是地图每次平移缩放（120ms 节流一帧）
   * 都会产生新的函数引用，传给常驻的 MobileDrawingControls 后 React.memo 失效，
   * 右侧工具条逐帧重渲染。这里改为用 ref 持有最新值，
   * 让导出回调的引用与地图视图彻底解耦。
   */
  const posterMetaRef = useRef({
    activeLayerName: '默认工作图层',
    activeLayerColor: '#3b82f6',
    featuresCount: 0,
    zoomLevel: DEFAULT_MAP_ZOOM,
    coords: DEFAULT_MAP_CENTER,
    author: '系统主管',
  });
  posterMetaRef.current = {
    activeLayerName: activeLayer?.name || '默认工作图层',
    activeLayerColor: activeLayer?.color || '#3b82f6',
    featuresCount: features.length,
    zoomLevel,
    coords: cursorCoords,
    author: currentUser?.displayName || '系统主管',
  };

  const handleOpenExportPoster = useCallback(async () => {
    setIsExportImageModalOpen(true);
    setIsExportingImage(true);
    setExportImageDataUrl(null);

    try {
      if (!mapRef.current) {
        throw new Error('地图未就绪');
      }
      // 捕获地图原始底图
      const rawDataUrl = await mapRef.current.captureMapImage();

      // 海报合成器按需加载（不进入首屏主包）
      const { generateMapPoster } = await import('./utils/mapPosterGenerator');

      // 合成带工程标题、指北针、图层色标与时间戳的水印成果简报
      const meta = posterMetaRef.current;
      const result = await generateMapPoster(rawDataUrl, {
        title: '现场空间地理协同标绘成果专题图',
        projectName: '空间地理协同采集与现场态势推演平台',
        activeLayerName: meta.activeLayerName,
        activeLayerColor: meta.activeLayerColor,
        featuresCount: meta.featuresCount,
        zoomLevel: Math.round(meta.zoomLevel),
        centerCoords: meta.coords,
        author: meta.author,
      });

      setExportImageDataUrl(result.dataUrl);
      if (result.degraded) {
        showToast(result.reason || '专题图合成失败，已回退为原始地图截图');
      }
    } catch (err: any) {
      console.error('Failed to generate poster:', err);
      showToast(`导出失败: ${err.message || '画布跨域或未就绪'}`);
      setIsExportImageModalOpen(false);
    } finally {
      setIsExportingImage(false);
    }
  }, [showToast]);

  // 清除要素
  const handleClearActiveLayer = useCallback(() => {
    handleClearFeatures(activeLayerId);
  }, [handleClearFeatures, activeLayerId]);

  const handleClearAllFeatures = useCallback(() => {
    handleClearFeatures();
  }, [handleClearFeatures]);

  // 导入与重置
  const handleImportData = useCallback(
    (importedLayers: any[], importedFeatures: any[]) => {
      if (importedLayers.length > 0) {
        const firstId = importedLayers[0].id;
        const isolated = importedLayers.map((l) => ({
          ...l,
          visible: l.id === firstId,
        }));
        resetLayers(isolated, firstId);
      } else {
        resetLayers(importedLayers);
      }
      resetFeatures(importedFeatures);
      showToast(`✓ 成功导入 ${importedLayers.length} 个图层，${importedFeatures.length} 个要素`);
    },
    [resetLayers, resetFeatures, showToast]
  );

  const handleResetDemo = useCallback(() => {
    const { layers: demoLayers, features: demoFeatures } = storageService.resetToDefault();
    const isolated = demoLayers.map((l, idx) => ({
      ...l,
      visible: idx === 0,
    }));
    resetLayers(isolated, demoLayers[0].id);
    resetFeatures(demoFeatures);
    showToast('已恢复初始演示态势，仅显示当前图层要素');
  }, [resetLayers, resetFeatures, showToast]);

  // 空间量算模式切换
  const handleToggleMeasureDistance = useCallback(() => {
    if (drawingTool === 'measure-distance') {
      setDrawingTool(null);
    } else {
      setDrawingTool('measure-distance');
      setSelectedFeatureId(null);
      setActiveTab(null);
    }
    setMeasureResult(null);
    setDrawingPointsCount(0);
  }, [drawingTool, setSelectedFeatureId]);

  const handleToggleMeasureArea = useCallback(() => {
    if (drawingTool === 'measure-area') {
      setDrawingTool(null);
    } else {
      setDrawingTool('measure-area');
      setSelectedFeatureId(null);
      setActiveTab(null);
    }
    setMeasureResult(null);
    setDrawingPointsCount(0);
  }, [drawingTool, setSelectedFeatureId]);

  const handleCancelDrawing = useCallback(() => {
    setDrawingTool(null);
    setMeasureResult(null);
    setDrawingPointsCount(0);
  }, []);

  // 8. 高德全国 POI 检索状态与基准定位
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userGpsCoord, setUserGpsCoord] = useState<[number, number] | null>(null);

  // 定位飞跃至检索地点
  const handleSelectPoiLocation = useCallback(
    (coord: [number, number], title: string, subtitle: string) => {
      mapRef.current?.flyToLocation(coord, title, subtitle, 16.5);
      showToast(`📍 已精准定位至: ${title}`);
    },
    [showToast]
  );

  // 将搜索到的 POI 一键保存为当前图层的标绘点要素
  const handleSavePoiAsFeature = useCallback(
    (poi: AmapPoiItem) => {
      handleCreateFeature({
        name: poi.name,
        type: 'marker',
        layerId: activeLayerId,
        coordinates: [poi.location],
        properties: {
          strokeColor: activeLayer?.color || '#3b82f6',
          strokeWidth: 2,
          strokeDasharray: 'solid',
          fillColor: activeLayer?.color || '#3b82f6',
          fillOpacity: 0.9,
          notes: poi.address,
          customAttributes: {
            'POI类型': poi.type || '地理地标',
            '所属区域': poi.district || '',
            '数据源': '高德全国POI',
          },
        },
      });
    },
    [handleCreateFeature, activeLayerId, activeLayer]
  );

  // 设备 GPS 实时定位
  const handleLocateGPS = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('当前设备环境不支持 GPS 定位');
      return;
    }
    showToast('正在获取 GPS 空间设备坐标...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setUserGpsCoord([longitude, latitude]);
        mapRef.current?.locateUser([longitude, latitude]);
        showToast(`✓ 已精准定位当前设备: ${longitude.toFixed(4)}, ${latitude.toFixed(4)}`);
      },
      () => {
        setUserGpsCoord([121.4737, 31.2304]);
        mapRef.current?.locateUser([121.4737, 31.2304]);
        showToast('已定位至上海项目基准工区 [121.4737, 31.2304]');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, [showToast]);

  /**
   * ─────────────────────────────────────────────────────────────
   * 稳定的回调集合
   * 下层抽屉 / 弹窗均已包 React.memo，只要传入的 props 引用不变，
   * 上层任何无关状态变化（如视口中心刷新）都不会让它们重渲染。
   * 因此这里把原先散落在 JSX 里的内联箭头函数全部提出来并用 useCallback 固定。
   *
   * 注意：本段必须位于「未登录提前 return」之前，否则会违反 Hooks 调用顺序规则。
   * ─────────────────────────────────────────────────────────────
   */
  const handleSelectFeatureFromMap = useCallback(
    (id: string | null) => {
      setSelectedFeatureId(id);
    },
    []
  );

  const handleCreateFeatureFromMap = useCallback(
    (featData: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => {
      handleCreateFeature(featData);
      setDrawingTool(null);
      setMeasureResult(null);
      setDrawingPointsCount(0);
    },
    [handleCreateFeature]
  );

  // 视口中心 / 缩放变化（地图平移缩放时触发，已在地图组件内部做 120ms 节流）
  const handleViewStateChange = useCallback((coords: [number, number], zoom: number) => {
    setCursorCoords(coords);
    setZoomLevel(zoom);
  }, []);

  const handleSnapFeedback = useCallback(() => {
    showToast('🧲 已吸附至相邻要素顶点');
  }, [showToast]);

  const handleBearingChange = useCallback((b: number, p: number) => {
    setBearing(b);
    setPitch(p);
  }, []);

  const handleUndoPoint = useCallback(() => mapRef.current?.undoPoint(), []);
  const handleFinishDrawing = useCallback(() => mapRef.current?.finishCurrentDrawing(), []);
  const handleUndoMeasurePoint = useCallback(() => mapRef.current?.undoMeasurePoint(), []);
  const handleClearMeasure = useCallback(() => mapRef.current?.clearMeasure(), []);
  const handleZoomIn = useCallback(() => mapRef.current?.zoomIn(), []);
  const handleZoomOut = useCallback(() => mapRef.current?.zoomOut(), []);
  const handleResetView = useCallback(() => mapRef.current?.resetView(), []);
  const handleResetNorth = useCallback(() => mapRef.current?.resetNorth(), []);

  const handleToggleSnapping = useCallback(() => {
    // 提示语必须在 setState updater 之外触发。
    // 原因：React 18 StrictMode 会双调用 updater 函数并把 updater 视为纯函数，
    // 在其内部调用 showToast 会导致提示重复触发（与 useLayers 中的约定一致）。
    const next = !enableSnapping;
    setEnableSnapping(next);
    showToast(next ? '🧲 顶点吸附已开启 (CAD/GIS精度)' : '⚪ 顶点吸附已关闭');
  }, [enableSnapping, showToast]);

  const handleOpenClearFeatures = useCallback(() => setIsClearModalOpen(true), []);
  const handleOpenSearch = useCallback(() => setIsSearchOpen(true), []);

  const handleQuickCardFocus = useCallback(() => {
    if (selectedFeature) handleLocateFeature(selectedFeature.id);
  }, [selectedFeature, handleLocateFeature]);
  const handleQuickCardOpenProperties = useCallback(() => setActiveTab('properties'), []);
  const handleQuickCardEditVertices = useCallback(() => {
    if (selectedFeature) handleStartVertexEdit(selectedFeature);
  }, [selectedFeature, handleStartVertexEdit]);
  const handleQuickCardDelete = useCallback(() => {
    if (selectedFeature) handleDeleteFeature(selectedFeature.id);
  }, [selectedFeature, handleDeleteFeature]);
  const handleQuickCardClose = useCallback(() => setSelectedFeatureId(null), []);

  const handleSelectPlotTool = useCallback(
    (tool: PlotFeatureType) => {
      setDrawingTool(tool);
      setSelectedFeatureId(null);
    },
    []
  );

  const handleChangeBasemap = useCallback(
    (mb: BasemapType) => {
      setBasemap(mb);
      showToast(`底图已切换为「${mb === 'dark' ? '暗夜科技' : mb === 'satellite' ? '遥感卫星' : '现代街道'}」`);
    },
    [showToast]
  );

  const handleOpenImportExport = useCallback(() => {
    setActiveTab(null);
    setIsImportExportModalOpen(true);
  }, []);

  const handleOpenPosterFromMore = useCallback(() => {
    setActiveTab(null);
    handleOpenExportPoster();
  }, [handleOpenExportPoster]);

  const handleOpenSearchFromMore = useCallback(() => {
    setActiveTab(null);
    setIsSearchOpen(true);
  }, []);

  // 抽屉 / 弹窗的开关闭合（统一收敛，保证 props 引用稳定）
  const handleCloseSheet = useCallback(() => setActiveTab(null), []);
  const handleStartPlotting = useCallback(() => setActiveTab('plot'), []);
  const handleClosePropertySheet = useCallback(() => {
    setActiveTab(null);
    setSelectedFeatureId(null);
  }, []);
  const handleOpenNewLayerModal = useCallback(() => setIsNewLayerModalOpen(true), []);
  const handleCloseNewLayerModal = useCallback(() => setIsNewLayerModalOpen(false), []);
  const handleCloseClearModal = useCallback(() => setIsClearModalOpen(false), []);
  const handleCloseImportExportModal = useCallback(() => setIsImportExportModalOpen(false), []);
  const handleCloseExportImageModal = useCallback(() => setIsExportImageModalOpen(false), []);
  const handleCloseSearch = useCallback(() => setIsSearchOpen(false), []);

  // 8. 电脑端调试时可选开启「真机外框预览」
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(false);

  // 未登录时展示登录界面
  if (!currentUser) {
    if (deviceFrameMode) {
      return (
        <div className="w-screen h-screen bg-slate-200 dark:bg-gray-950 flex flex-col items-center justify-center overflow-hidden transition-colors duration-200">
          <div className="fixed top-2 right-2 z-50 hidden md:flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-slate-300 dark:border-gray-800 rounded-full text-[11px] text-slate-700 dark:text-gray-400">
            <button
              onClick={() => setDeviceFrameMode(false)}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-white transition"
              title="切换为全屏铺满模式"
            >
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
              <span>铺满移动屏</span>
            </button>
          </div>
          <div className="relative w-[390px] h-[844px] max-h-[96vh] rounded-[48px] border-[10px] border-slate-800 dark:border-gray-800 bg-slate-100 dark:bg-gray-950 shadow-2xl shadow-blue-950/30 overflow-hidden flex flex-col ring-1 ring-black/10 dark:ring-white/10">
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-800 mr-2" />
              <div className="w-2 h-2 rounded-full bg-blue-900/60" />
            </div>
            <MobileLoginView
              onLoginSuccess={handleLoginSuccess}
              theme={theme}
              onToggleTheme={handleToggleTheme}
            />
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full z-40" />
          </div>
        </div>
      );
    }
    return (
      <div className="w-screen h-screen bg-slate-100 dark:bg-gray-950 flex flex-col items-center justify-center overflow-hidden relative transition-colors duration-200">
        <div className="fixed top-2 right-2 z-50 hidden md:flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-slate-300 dark:border-gray-800 rounded-full text-[11px] text-slate-700 dark:text-gray-400">
          <button
            onClick={() => setDeviceFrameMode(true)}
            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-white transition"
            title="切换为手机真机外框预览"
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-500" />
            <span>手机真机外框预览</span>
          </button>
        </div>
        <MobileLoginView
          onLoginSuccess={handleLoginSuccess}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      </div>
    );
  }

  // 移动端主界面容器渲染
  const renderMobileAppContent = () => (
    <div className="relative w-full h-full flex flex-col bg-slate-100 dark:bg-gray-950 overflow-hidden select-none transition-colors duration-200">
      {/* 1. 移动端顶部全局地名检索栏 (高德风格沉浸式搜索) */}
      <MobileHeader onOpenSearch={handleOpenSearch} />

      {/* 顶部 GIS 视口坐标与比例尺悬浮 HUD */}
      {!drawingTool && !editingFeature && (
        <div
          className="absolute left-3 z-20 pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 shadow-lg text-slate-700 dark:text-gray-200 text-[11px] font-mono select-none"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 3.75rem)' }}
        >
          <button
            onClick={handleCycleCoordinateFormat}
            className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
            title="点击切换坐标显示格式 (DD / DMS / 墨卡托)"
          >
            <Compass className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="font-bold">{formatCoordinates(cursorCoords, coordinateFormat, 5)}</span>
          </button>
          <span className="text-slate-300 dark:text-gray-700">|</span>
          <span className="text-slate-500 dark:text-gray-400 font-bold">Z{zoomLevel.toFixed(1)}</span>
          <button
            onClick={handleCopyCoordinates}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-blue-500 transition cursor-pointer"
            title="复制当前中心坐标"
          >
            <Copy className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* 标绘与操作反馈 Toast */}
      {toastMessage &&
        (typeof document !== 'undefined'
          ? createPortal(
              <div
                className={`fixed left-1/2 -translate-x-1/2 z-[65] px-4 py-2 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-emerald-500/50 shadow-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md animate-in slide-in-from-bottom-2 duration-200 max-w-[calc(100%-7rem)] ${
                  toastAction ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
                style={{
                  bottom: `calc(env(safe-area-inset-bottom, 0px) + ${
                    drawingTool || selectedFeature ? '9.25rem' : '7rem'
                  })`,
                }}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">{toastMessage}</span>
                {toastAction && (
                  <button
                    onClick={() => {
                      const action = toastAction;
                      setToastAction(null);
                      action.onClick();
                    }}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[11px] font-bold transition"
                  >
                    {toastAction.label}
                  </button>
                )}
              </div>,
              document.body
            )
          : null)}

      {/* 2. MapTalks GL 触控地图画布 */}
      <div className="flex-1 w-full h-full relative overflow-hidden">
        <MaptalksContainer
          ref={mapRef}
          layers={layers}
          features={features}
          activeLayerId={activeLayerId}
          selectedFeatureId={selectedFeatureId}
          drawingTool={drawingTool}
          basemap={basemap}
          enableSnapping={enableSnapping}
          onSelectFeature={handleSelectFeatureFromMap}
          onCreateFeature={handleCreateFeatureFromMap}
          onCancelDrawing={handleCancelDrawing}
          onCoordinatesChange={handleViewStateChange}
          onDrawingPointsChange={setDrawingPointsCount}
          onMeasureResultChange={setMeasureResult}
          onTopologyWarning={setTopologyWarning}
          onActiveSegmentChange={setActiveSegment}
          onSnapFeedback={handleSnapFeedback}
          onBearingChange={handleBearingChange}
        />

        {/* 3. 移动端浮动控制面板 (标绘中状态控制条) */}
        <MobileDrawingControls
          drawingTool={drawingTool}
          drawingPointsCount={drawingPointsCount}
          bearing={bearing}
          measureResult={measureResult}
          enableSnapping={enableSnapping}
          topologyWarning={topologyWarning}
          activeSegment={activeSegment}
          cursorCoords={cursorCoords}
          onAddCenterPoint={handleAddCenterPoint}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          hasSelectedFeature={!!selectedFeature && !drawingTool && activeTab !== 'properties'}
          onCancelDrawing={handleCancelDrawing}
          onUndoPoint={handleUndoPoint}
          onFinishDrawing={handleFinishDrawing}
          onUndoMeasurePoint={handleUndoMeasurePoint}
          onClearMeasure={handleClearMeasure}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetView={handleResetView}
          onResetNorth={handleResetNorth}
          onToggleSnapping={handleToggleSnapping}
          onToggleMeasureDistance={handleToggleMeasureDistance}
          onToggleMeasureArea={handleToggleMeasureArea}
          onLocateGPS={handleLocateGPS}
          onExportPoster={handleOpenExportPoster}
          onOpenClearFeatures={handleOpenClearFeatures}
        />

        {/* 要素快览悬浮卡片 */}
        {selectedFeature && !drawingTool && activeTab !== 'properties' && !editingFeature && (
          <MobileFeatureQuickCard
            feature={selectedFeature}
            layer={layers.find((l) => l.id === selectedFeature.layerId)}
            onFocus={handleQuickCardFocus}
            onOpenProperties={handleQuickCardOpenProperties}
            onEditVertices={handleQuickCardEditVertices}
            onOpenBuffer={() => handleOpenBufferModal(selectedFeature)}
            onDelete={handleQuickCardDelete}
            onClose={handleQuickCardClose}
          />
        )}

        {/* 顶点二次拖拽与重定位微调浮动控制台 */}
        {editingFeature && (
          <div
            className="absolute left-3 right-3 z-30 pointer-events-auto bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-2 border-amber-500/80 rounded-3xl p-3.5 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 ring-1 ring-amber-500/30 space-y-2.5"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.25rem)' }}
          >
            {/* 顶层：要素名称、当前选中拐点指示与前后切换按钮 */}
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-amber-600 dark:text-amber-400">
                  <Move className="w-4 h-4 animate-pulse shrink-0" />
                  <span className="truncate">微调: {editingFeature.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate font-mono">
                  {editingCoords[selectedVertexIndex]
                    ? `${editingCoords[selectedVertexIndex][0].toFixed(5)}°E, ${editingCoords[selectedVertexIndex][1].toFixed(5)}°N`
                    : '共 ' + editingCoords.length + ' 个拐点'}
                </div>
              </div>

              {/* 拐点前后切换胶囊 */}
              <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-1 shrink-0">
                <button
                  onClick={() => {
                    const prev = (selectedVertexIndex - 1 + editingCoords.length) % editingCoords.length;
                    handleSelectVertex(prev);
                  }}
                  className="p-1 rounded-xl hover:bg-amber-200/50 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-200 transition active:scale-90 cursor-pointer"
                  title="上一个拐点"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-black text-amber-700 dark:text-amber-300 font-mono px-1.5">
                  点 {selectedVertexIndex + 1}/{editingCoords.length}
                </span>
                <button
                  onClick={() => {
                    const next = (selectedVertexIndex + 1) % editingCoords.length;
                    handleSelectVertex(next);
                  }}
                  className="p-1 rounded-xl hover:bg-amber-200/50 dark:hover:bg-amber-800/50 text-amber-800 dark:text-amber-200 transition active:scale-90 cursor-pointer"
                  title="下一个拐点"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 中间层：高精度方向微调键盘与操作指引 */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight min-w-0 flex-1">
                <span className="font-semibold text-slate-700 dark:text-slate-300 block">💡 移动方式：</span>
                直接点击地图任意处可立即重定位，亦可拖拽把手或按键微调。
              </div>

              {/* 拐点增删与步长切换 */}
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleInsertVertex}
                    className="flex items-center gap-1 px-2 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 active:scale-90 transition cursor-pointer"
                    title="在当前拐点后插入新拐点"
                  >
                    <Plus className="w-3 h-3" />
                    <span>插点</span>
                  </button>
                  <button
                    onClick={handleDeleteVertex}
                    disabled={editingCoords.length <= (editingFeature.type === 'polygon' ? 3 : 2)}
                    className="flex items-center gap-1 px-2 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-[10px] font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-40 active:scale-90 transition cursor-pointer"
                    title="删除当前选中的拐点"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>删点</span>
                  </button>
                </div>
                <button
                  onClick={handleCycleNudgeStep}
                  className="px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 font-mono text-[9px] font-bold border border-amber-300/60 dark:border-amber-700/60 hover:bg-amber-200 active:scale-95 transition text-center cursor-pointer"
                  title="点击切换微调步长 (0.5m / 1m / 5m / 20m)"
                >
                  步长: {nudgeStep}m
                </button>
              </div>

              {/* 4 方向精密微调按钮组 (可变精度) */}
              <div className="grid grid-cols-3 gap-1 shrink-0 items-center justify-items-center">
                <div />
                <button
                  onClick={() => handleNudgeVertex(0, nudgeStep)}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={`向北微移 ${nudgeStep} 米`}
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <div />
                <button
                  onClick={() => handleNudgeVertex(-nudgeStep, 0)}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={`向西微移 ${nudgeStep} 米`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleNudgeVertex(0, -nudgeStep)}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={`向南微移 ${nudgeStep} 米`}
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleNudgeVertex(nudgeStep, 0)}
                  className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition shadow-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                  title={`向东微移 ${nudgeStep} 米`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 底层：取消与保存操作 */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={handleCancelVertexEdit}
                className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold active:scale-95 transition text-center cursor-pointer"
              >
                取消修改
              </button>
              <button
                onClick={handleSaveVertexEdit}
                className="flex-[1.5] py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-xs font-bold shadow-lg shadow-orange-500/25 hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>保存微调并更新要素</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. 移动端底部导航工具栏 (TabBar) */}
      <MobileTabBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        layersCount={layers.length}
        featuresCount={features.length}
        hasSelectedFeature={!!selectedFeatureId}
        isDrawing={!!drawingTool}
      />

      {/*
        5. 底部滑出抽屉组件群
        性能要点：抽屉采用「按需挂载」——关闭时整个组件树不挂载，
        既避免了 6 个抽屉内部的 features.filter / layers.map 逐帧计算，
        也让每个抽屉的内部状态（搜索词、展开项等）随关闭自然释放。
      */}
      {/* 图层管理抽屉 */}
      {activeTab === 'layers' && (
        <MobileLayerSheet
          isOpen
          onClose={handleCloseSheet}
          layers={layers}
          features={features}
          activeLayerId={activeLayerId}
          onSelectActiveLayer={handleSelectActiveLayer}
          onToggleVisibility={handleToggleLayerVisibility}
          onToggleLock={handleToggleLayerLock}
          onChangeOpacity={handleChangeLayerOpacity}
          onDeleteLayer={handleDeleteLayer}
          onOpenNewLayerModal={handleOpenNewLayerModal}
          onShowOnlyActiveLayer={handleShowOnlyActiveLayer}
          onShowAllLayers={handleShowAllLayers}
          onStartPlotting={handleStartPlotting}
          onSelectFeature={handleLocateFeature}
          onLocateFeature={handleLocateFeature}
          onDeleteFeature={handleDeleteFeature}
        />
      )}

      {/* 标绘工具箱抽屉 */}
      {activeTab === 'plot' && (
        <MobilePlottingSheet
          isOpen
          onClose={handleCloseSheet}
          currentDrawingTool={drawingTool as PlotFeatureType}
          onSelectTool={handleSelectPlotTool}
          activeLayerName={activeLayer?.name || '默认工作图层'}
          activeLayerColor={activeLayer?.color || '#3b82f6'}
          layers={layers}
          activeLayerId={activeLayerId}
          onSelectActiveLayer={handleSelectActiveLayer}
        />
      )}

      {/* 要素清单抽屉 */}
      {activeTab === 'features' && (
        <MobileFeatureListSheet
          isOpen
          onClose={handleCloseSheet}
          features={features}
          layers={layers}
          activeLayerId={activeLayerId}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={handleLocateFeature}
          onLocateFeature={handleLocateFeature}
          onDeleteFeature={handleDeleteFeature}
          onOpenPlotting={handleStartPlotting}
          onOpenClearFeatures={handleOpenClearFeatures}
          onSelectActiveLayer={handleSelectActiveLayer}
        />
      )}

      {/* 选中的要素属性配置抽屉 */}
      {activeTab === 'properties' && (
        <MobilePropertySheet
          isOpen
          onClose={handleClosePropertySheet}
          feature={selectedFeature}
          layers={layers}
          allFeatures={features}
          onUpdateFeature={handleUpdateFeature}
          onDeleteFeature={handleDeleteFeature}
          onOpenBufferModal={handleOpenBufferModal}
        />
      )}

      {/* 「我的」面板抽屉 (账号资料 / 偏好设置 / 数据管理) */}
      {activeTab === 'more' && (
        <MobileMoreSheet
          isOpen
          onClose={handleCloseSheet}
          currentUser={currentUser}
          basemap={basemap}
          onChangeBasemap={handleChangeBasemap}
          onOpenImportExport={handleOpenImportExport}
          onExportPoster={handleOpenPosterFromMore}
          onOpenSearch={handleOpenSearchFromMore}
          onResetDemo={handleResetDemo}
          onLogout={handleLogout}
          theme={theme}
          onSelectTheme={handleSelectTheme}
        />
      )}

      {/*
        6. 模态弹窗群
        这几个弹窗均为低频功能且体积不小，统一走 React.lazy 按需加载，
        配合「按需挂载」既避免首屏下载无关代码，也避免关闭时的无效渲染。
      */}
      {isNewLayerModalOpen && (
        <Suspense fallback={null}>
          <NewLayerModal
            isOpen
            onClose={handleCloseNewLayerModal}
            onCreateLayer={handleCreateLayer}
          />
        </Suspense>
      )}

      {isClearModalOpen && (
        <Suspense fallback={null}>
          <ClearFeaturesModal
            isOpen
            onClose={handleCloseClearModal}
            activeLayerName={activeLayer?.name || '当前工作图层'}
            activeLayerColor={activeLayer?.color || '#3b82f6'}
            activeLayerFeatureCount={features.filter((f) => f.layerId === activeLayerId).length}
            totalFeatureCount={features.length}
            onClearActiveLayer={handleClearActiveLayer}
            onClearAllFeatures={handleClearAllFeatures}
            onResetDemo={handleResetDemo}
          />
        </Suspense>
      )}

      {isImportExportModalOpen && (
        <Suspense fallback={null}>
          <ImportExportModal
            isOpen
            onClose={handleCloseImportExportModal}
            layers={layers}
            features={features}
            activeLayerId={activeLayerId}
            onImportData={handleImportData}
            onResetDemo={handleResetDemo}
            onNotify={showToast}
          />
        </Suspense>
      )}

      {/* 空间动态缓冲区分析弹窗 */}
      {bufferTargetFeature && (
        <Suspense fallback={null}>
          <BufferModal
            isOpen={!!bufferTargetFeature}
            onClose={handleCloseBufferModal}
            feature={bufferTargetFeature}
            layers={layers}
            activeLayerId={activeLayerId}
            onCreateFeature={handleCreateFeature}
            onNotify={showToast}
          />
        </Suspense>
      )}

      {/* 高清标绘成果简报图导出预览弹窗 */}
      {isExportImageModalOpen && (
        <Suspense fallback={null}>
          <ExportImageModal
            isOpen
            onClose={handleCloseExportImageModal}
            imageUrl={exportImageDataUrl}
            isLoading={isExportingImage}
            onNotify={showToast}
          />
        </Suspense>
      )}

      {/* 7. 全国 POI 地名/地址检索抽屉 */}
      {isSearchOpen && (
        <Suspense fallback={null}>
          <MobilePoiSearchSheet
            isOpen
            onClose={handleCloseSearch}
            currentCenter={cursorCoords}
            userGpsCoord={userGpsCoord}
            features={features}
            layers={layers}
            onSelectLocation={handleSelectPoiLocation}
            onSaveAsFeature={handleSavePoiAsFeature}
            onNotify={showToast}
          />
        </Suspense>
      )}
    </div>
  );

  return (
    <div className="w-full h-full min-h-screen bg-slate-900 flex items-center justify-center overflow-hidden">
      {/* 桌面端审查控制条 */}
      <div className="fixed top-2 right-2 z-50 hidden md:flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-slate-300 dark:border-gray-800 rounded-full text-[11px] text-slate-700 dark:text-gray-400 shadow-md">
        <button
          onClick={() => setDeviceFrameMode(!deviceFrameMode)}
          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-white transition"
          title="切换真机外框预览模式"
        >
          {deviceFrameMode ? (
            <>
              <Monitor className="w-3.5 h-3.5 text-blue-500" />
              <span>铺满移动屏</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-cyan-500" />
              <span>手机真机外框预览</span>
            </>
          )}
        </button>
      </div>

      {deviceFrameMode ? (
        /* 📱 手机真机仿真外壳 */
        <div className="relative w-[390px] h-[844px] max-h-[96vh] rounded-[48px] border-[10px] border-slate-800 dark:border-gray-800 bg-slate-100 dark:bg-gray-950 shadow-2xl shadow-blue-950/30 overflow-hidden flex flex-col ring-1 ring-black/10 dark:ring-white/10">
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-800 mr-2" />
            <div className="w-2 h-2 rounded-full bg-blue-900/60" />
          </div>
          {renderMobileAppContent()}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full z-40" />
        </div>
      ) : (
        /* 📲 原生 100% 全屏移动端模式 */
        renderMobileAppContent()
      )}
    </div>
  );
};

export default App;
