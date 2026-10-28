import React, { useState, useEffect, useRef } from 'react';
import { User, PlotLayer, PlotFeature, PlotFeatureType, BasemapType } from './types';
import { authService } from './services/authService';
import { storageService, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './services/storageService';
import { MaptalksContainer, MaptalksContainerRef } from './components/Map/MaptalksContainer';
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
import { NewLayerModal } from './components/Modals/NewLayerModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { ClearFeaturesModal } from './components/Modals/ClearFeaturesModal';
import { Smartphone, Monitor, Compass, Copy } from 'lucide-react';
import { CoordinateFormat, formatCoordinates } from './utils/geoUtils';
import { ThemeMode, themeService } from './services/themeService';

export const App: React.FC = () => {
  const mapRef = useRef<MaptalksContainerRef>(null);

  // 0. 全局明暗风格主题管理 (支持在登录页、顶部胶囊与控制中心即时切换)
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.initTheme());

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    themeService.setTheme(next);
    // 浅色模式下底图同步切换为清新街道高对比底图；暗色模式下同步切换为极夜科技底图
    if (next === 'light' && basemap === 'dark') {
      setBasemap('street');
    } else if (next === 'dark' && basemap === 'street') {
      setBasemap('dark');
    }
  };

  const handleSelectTheme = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    themeService.setTheme(newTheme);
    if (newTheme === 'light' && basemap === 'dark') {
      setBasemap('street');
    } else if (newTheme === 'dark' && basemap === 'street') {
      setBasemap('dark');
    }
  };

  // 1. 用户会话管理 (免后端模拟认证)
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());

  // 2. 标绘图层与要素数据状态 (默认确保仅显示当前激活图层下的要素)
  const [layers, setLayers] = useState<PlotLayer[]>(() => {
    const loaded = storageService.loadLayers();
    const activeId = storageService.getActiveLayerId(loaded);
    return loaded.map((l) => ({
      ...l,
      visible: l.id === activeId,
    }));
  });
  const [features, setFeatures] = useState<PlotFeature[]>(() => storageService.loadFeatures());
  const [activeLayerId, setActiveLayerId] = useState<string>(() =>
    storageService.getActiveLayerId(layers)
  );

  // 3. 移动端 Tab 与交互状态
  const [activeTab, setActiveTab] = useState<MobileTab>(null);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [drawingTool, setDrawingTool] = useState<PlotFeatureType | 'measure-distance' | 'measure-area' | null>(null);
  const [drawingPointsCount, setDrawingPointsCount] = useState<number>(0);
  const [basemap, setBasemap] = useState<BasemapType>(() => themeService.getTheme() === 'light' ? 'street' : 'dark');
  const [cursorCoords, setCursorCoords] = useState<[number, number]>(DEFAULT_MAP_CENTER);
  const [zoomLevel, setZoomLevel] = useState<number>(DEFAULT_MAP_ZOOM);
  const [coordinateFormat, setCoordinateFormat] = useState<CoordinateFormat>('DD');
  const [bearing, setBearing] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [enableSnapping, setEnableSnapping] = useState<boolean>(true);
  const [topologyWarning, setTopologyWarning] = useState<string | null>(null);
  const [activeSegment, setActiveSegment] = useState<{ length: number; azimuth: { degrees: number; text: string } } | null>(null);

  const handleCycleCoordinateFormat = () => {
    setCoordinateFormat((prev) => {
      if (prev === 'DD') return 'DMS';
      if (prev === 'DMS') return 'MERCATOR';
      return 'DD';
    });
  };

  const handleCopyCoordinates = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = formatCoordinates(cursorCoords, coordinateFormat, 6);
    navigator.clipboard?.writeText(text);
    showToast(`✓ 已复制精确坐标: ${text}`);
  };

  // 4. 模态弹窗状态
  const [isNewLayerModalOpen, setIsNewLayerModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  // 清除地图要素处理
  const handleClearActiveLayer = () => {
    const count = features.filter((f) => f.layerId === activeLayerId).length;
    setFeatures((prev) => prev.filter((f) => f.layerId !== activeLayerId));
    setSelectedFeatureId(null);
    showToast(`✓ 已清除图层「${activeLayer?.name || '工作图层'}」的 ${count} 个要素`);
  };

  const handleClearAllFeatures = () => {
    const count = features.length;
    setFeatures([]);
    setSelectedFeatureId(null);
    showToast(`✓ 已清空全地图所有要素 (共 ${count} 个)`);
  };

  // 5. 电脑端调试时可选开启「真机外框预览」
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // 本地 LocalStorage 持久化同步
  useEffect(() => {
    storageService.saveLayers(layers);
  }, [layers]);

  useEffect(() => {
    storageService.saveFeatures(features);
  }, [features]);

  useEffect(() => {
    if (activeLayerId) {
      storageService.setActiveLayerId(activeLayerId);
    }
  }, [activeLayerId]);

  // 用户操作
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveTab(null);
  };

  // 切换激活工作图层：核心逻辑，仅显示该图层下要素，自动隐藏其他图层要素
  const handleSelectActiveLayer = (layerId: string) => {
    setActiveLayerId(layerId);
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: l.id === layerId,
      }))
    );
    const target = layers.find((l) => l.id === layerId);
    if (target) {
      showToast(`已切换至「${target.name}」，地图仅显示该图层要素`);
    }
  };

  // 快捷视图范围控制：仅显示当前工作图层 vs 显示全图层
  const handleShowOnlyActiveLayer = () => {
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: l.id === activeLayerId,
      }))
    );
    showToast('已切换为仅显示当前图层要素');
  };

  const handleShowAllLayers = () => {
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: true,
      }))
    );
    showToast('已显示全部图层要素');
  };

  // 图层操作
  const handleCreateLayer = (newLayerData: Omit<PlotLayer, 'id' | 'createdAt'>) => {
    const newLayer: PlotLayer = {
      ...newLayerData,
      id: `layer-${Date.now()}`,
      createdAt: Date.now(),
      visible: true,
    };
    // 新建图层并设为当前显示图层，其余图层自动隐藏
    const updated = [...layers.map((l) => ({ ...l, visible: false })), newLayer];
    setLayers(updated);
    setActiveLayerId(newLayer.id);
    setActiveTab('layers'); // 自动唤起图层管控抽屉，让用户立即看到新图层
    setToastMessage(`✓ 已新建并切换至「${newLayer.name}」，地图仅显示该图层要素`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleLayerVisibility = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleToggleLayerLock = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
    );
  };

  const handleChangeLayerOpacity = (layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) {
      alert('至少需要保留一个图层！');
      return;
    }
    const updated = layers.filter((l) => l.id !== layerId);
    setLayers(updated);
    setFeatures((prev) => prev.filter((f) => f.layerId !== layerId));
    if (activeLayerId === layerId) {
      handleSelectActiveLayer(updated[0].id);
    }
  };

  // 要素操作
  const handleCreateFeature = (featureData: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => {
    // 确保所属图层处于可见状态，避免要素落库后因图层隐藏而看不到
    setLayers((prev) =>
      prev.map((l) => (l.id === featureData.layerId && !l.visible ? { ...l, visible: true } : l))
    );

    const targetLayer = layers.find((l) => l.id === featureData.layerId);

    const newFeature: PlotFeature = {
      ...featureData,
      id: `feat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setFeatures((prev) => [...prev, newFeature]);
    setSelectedFeatureId(newFeature.id);
    setDrawingTool(null);
    showToast(`✓ 已在「${targetLayer?.name || '指定图层'}」中创建要素 "${newFeature.name}"`);
  };

  const handleUpdateFeature = (updated: PlotFeature) => {
    setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };

  const handleDeleteFeature = (featureId: string) => {
    setFeatures((prev) => prev.filter((f) => f.id !== featureId));
    if (selectedFeatureId === featureId) {
      setSelectedFeatureId(null);
    }
  };

  // 导入与重置
  const handleImportData = (importedLayers: PlotLayer[], importedFeatures: PlotFeature[]) => {
    if (importedLayers.length > 0) {
      const firstId = importedLayers[0].id;
      // 默认仅激活的第一个图层可见
      const isolated = importedLayers.map((l) => ({
        ...l,
        visible: l.id === firstId,
      }));
      setLayers(isolated);
      setActiveLayerId(firstId);
    } else {
      setLayers(importedLayers);
    }
    setFeatures(importedFeatures);
    setSelectedFeatureId(null);
  };

  const handleResetDemo = () => {
    const { layers: demoLayers, features: demoFeatures } = storageService.resetToDefault();
    const isolated = demoLayers.map((l, idx) => ({
      ...l,
      visible: idx === 0,
    }));
    setLayers(isolated);
    setFeatures(demoFeatures);
    setActiveLayerId(demoLayers[0].id);
    setSelectedFeatureId(null);
    showToast('已恢复初始演示态势，仅显示当前图层要素');
  };

  // 空间量算模式切换 (测距与测面)
  const handleToggleMeasureDistance = () => {
    if (drawingTool === 'measure-distance') {
      setDrawingTool(null);
    } else {
      setDrawingTool('measure-distance');
      setSelectedFeatureId(null);
      setActiveTab(null);
    }
  };

  const handleToggleMeasureArea = () => {
    if (drawingTool === 'measure-area') {
      setDrawingTool(null);
    } else {
      setDrawingTool('measure-area');
      setSelectedFeatureId(null);
      setActiveTab(null);
    }
  };

  // 设备 GPS 实时定位
  const handleLocateGPS = () => {
    if (!navigator.geolocation) {
      showToast('当前设备环境不支持 GPS 定位');
      return;
    }
    showToast('正在获取 GPS 空间设备坐标...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        mapRef.current?.locateUser([longitude, latitude]);
        showToast(`✓ 已精准定位当前设备: ${longitude.toFixed(4)}, ${latitude.toFixed(4)}`);
      },
      () => {
        // 模拟/基准工区定位兜底 (上海核心区)
        mapRef.current?.locateUser([121.4737, 31.2304]);
        showToast('已定位至上海项目基准工区 [121.4737, 31.2304]');
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
  const selectedFeature = features.find((f) => f.id === selectedFeatureId) || null;

  // 未登录时展示移动端登录 (支持真机外框仿真与全屏自适应，双色实时自适应)
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
      {/* 1. 移动端顶部状态与标题栏 (灵动胶囊风格，包含快速主题切换与图层概览) */}
      <MobileHeader
        currentUser={currentUser}
        activeLayer={activeLayer}
        onOpenLayers={() => setActiveTab('layers')}
        onOpenMore={() => setActiveTab('more')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* 标绘与操作反馈 Toast */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-white/95 dark:bg-gray-900/95 border border-emerald-500/50 shadow-2xl text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

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
          onSelectFeature={(id) => {
            setSelectedFeatureId(id);
          }}
          onCreateFeature={handleCreateFeature}
          onCancelDrawing={() => setDrawingTool(null)}
          onCoordinatesChange={(coords, zoom) => {
            setCursorCoords(coords);
            setZoomLevel(zoom);
          }}
          onDrawingPointsChange={setDrawingPointsCount}
          onTopologyWarning={setTopologyWarning}
          onActiveSegmentChange={setActiveSegment}
          onSnapFeedback={() => showToast('🧲 已吸附至相邻要素顶点')}
          onBearingChange={(b, p) => {
            setBearing(b);
            setPitch(p);
          }}
        />

        {/* 底部左侧：空间经纬度与比例尺沉浸式徽章 (专业GIS底栏布局，明暗自适应) */}
        {!drawingTool && !selectedFeature && (
          <div
            onClick={handleCycleCoordinateFormat}
            className="absolute bottom-[68px] left-3 z-10 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border border-slate-200/90 dark:border-white/10 shadow-lg text-slate-700 dark:text-gray-300 font-mono text-[10px] active:scale-95 transition cursor-pointer select-none max-w-[calc(100%-60px)]"
            title="点击切换坐标系统 (DD / DMS / EPSG:3857)"
          >
            <Compass className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-800 dark:text-gray-200 truncate">
                {formatCoordinates(cursorCoords, coordinateFormat, 4)}
              </span>
              <span className="text-slate-300 dark:text-gray-600 shrink-0">|</span>
              <span className="text-blue-600 dark:text-blue-300 font-bold shrink-0">Z{zoomLevel.toFixed(1)}</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[9px] font-bold shrink-0">
                {coordinateFormat === 'DD' ? 'WGS84' : coordinateFormat === 'DMS' ? '度分秒' : '3857米'}
              </span>
            </div>
            <button
              onClick={handleCopyCoordinates}
              className="p-1 rounded-full text-slate-400 dark:text-gray-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition shrink-0 ml-0.5"
              title="一键复制高精坐标至剪贴板"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* 3. 移动端悬浮标绘指导与右侧触控按钮 */}
        <MobileDrawingControls
          drawingTool={drawingTool}
          drawingPointsCount={drawingPointsCount}
          bearing={bearing}
          enableSnapping={enableSnapping}
          topologyWarning={topologyWarning}
          activeSegment={activeSegment}
          hasSelectedFeature={!!selectedFeature && !drawingTool && activeTab !== 'properties'}
          onCancelDrawing={() => setDrawingTool(null)}
          onUndoPoint={() => mapRef.current?.undoPoint()}
          onFinishDrawing={() => mapRef.current?.finishCurrentDrawing()}
          onToggleSnapping={() => setEnableSnapping(!enableSnapping)}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onResetView={() => mapRef.current?.resetView()}
          onResetNorth={() => mapRef.current?.resetNorth()}
          onOpenClearFeatures={() => setIsClearModalOpen(true)}
          onToggleMeasureDistance={handleToggleMeasureDistance}
          onToggleMeasureArea={handleToggleMeasureArea}
          onLocateGPS={handleLocateGPS}
        />

        {/* 要素快览悬浮卡片 (轻量化交互，触碰要素时不粗暴遮挡主地图) */}
        {selectedFeature && !drawingTool && activeTab !== 'properties' && (
          <MobileFeatureQuickCard
            feature={selectedFeature}
            layer={layers.find((l) => l.id === selectedFeature.layerId)}
            onFocus={() => mapRef.current?.focusFeature?.(selectedFeature.id)}
            onOpenProperties={() => setActiveTab('properties')}
            onDelete={() => handleDeleteFeature(selectedFeature.id)}
            onClose={() => setSelectedFeatureId(null)}
          />
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

      {/* 5. 底部滑出抽屉组件群 */}
      {/* 图层管理抽屉 (GIS 图层与要素树) */}
      <MobileLayerSheet
        isOpen={activeTab === 'layers'}
        onClose={() => setActiveTab(null)}
        layers={layers}
        features={features}
        activeLayerId={activeLayerId}
        onSelectActiveLayer={handleSelectActiveLayer}
        onToggleVisibility={handleToggleLayerVisibility}
        onToggleLock={handleToggleLayerLock}
        onChangeOpacity={handleChangeLayerOpacity}
        onDeleteLayer={handleDeleteLayer}
        onOpenNewLayerModal={() => setIsNewLayerModalOpen(true)}
        onShowOnlyActiveLayer={handleShowOnlyActiveLayer}
        onShowAllLayers={handleShowAllLayers}
        onStartPlotting={() => setActiveTab('plot')}
        onSelectFeature={(id) => {
          setSelectedFeatureId(id);
          setActiveTab('properties');
        }}
        onLocateFeature={(id) => {
          setSelectedFeatureId(id);
          setActiveTab(null);
          const feat = features.find((f) => f.id === id);
          if (feat) {
            showToast(`📍 已在地图中居中聚焦要素: ${feat.name}`);
          }
        }}
        onDeleteFeature={handleDeleteFeature}
      />

      {/* 标绘工具箱抽屉 */}
      <MobilePlottingSheet
        isOpen={activeTab === 'plot'}
        onClose={() => setActiveTab(null)}
        currentDrawingTool={drawingTool as PlotFeatureType}
        onSelectTool={(tool) => {
          setDrawingTool(tool);
          setSelectedFeatureId(null);
        }}
        activeLayerName={activeLayer?.name || '默认工作图层'}
        activeLayerColor={activeLayer?.color || '#3b82f6'}
        layers={layers}
        activeLayerId={activeLayerId}
        onSelectActiveLayer={handleSelectActiveLayer}
      />

      {/* 要素清单抽屉 */}
      <MobileFeatureListSheet
        isOpen={activeTab === 'features'}
        onClose={() => setActiveTab(null)}
        features={features}
        layers={layers}
        activeLayerId={activeLayerId}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={(id) => {
          setSelectedFeatureId(id);
          setActiveTab('properties');
        }}
        onDeleteFeature={handleDeleteFeature}
        onOpenPlotting={() => setActiveTab('plot')}
        onOpenClearFeatures={() => setIsClearModalOpen(true)}
        onSelectActiveLayer={handleSelectActiveLayer}
      />

      {/* 选中的要素属性配置抽屉 */}
      <MobilePropertySheet
        isOpen={activeTab === 'properties'}
        onClose={() => {
          setActiveTab(null);
          setSelectedFeatureId(null);
        }}
        feature={selectedFeature}
        layers={layers}
        onUpdateFeature={handleUpdateFeature}
        onDeleteFeature={handleDeleteFeature}
      />

      {/* 更多与设置抽屉 */}
      <MobileMoreSheet
        isOpen={activeTab === 'more'}
        onClose={() => setActiveTab(null)}
        currentUser={currentUser}
        basemap={basemap}
        onChangeBasemap={setBasemap}
        onOpenImportExport={() => setIsImportExportModalOpen(true)}
        onResetDemo={handleResetDemo}
        onLogout={handleLogout}
        theme={theme}
        onSelectTheme={handleSelectTheme}
      />

      {/* 新建图层弹窗 */}
      <NewLayerModal
        isOpen={isNewLayerModalOpen}
        onClose={() => setIsNewLayerModalOpen(false)}
        onCreateLayer={handleCreateLayer}
      />

      {/* 工程导入导出弹窗 */}
      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        layers={layers}
        features={features}
        onImportData={handleImportData}
        onResetDemo={handleResetDemo}
      />

      {/* 清空地图要素确认弹窗 */}
      <ClearFeaturesModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        activeLayerName={activeLayer?.name || '默认工作图层'}
        activeLayerColor={activeLayer?.color || '#3b82f6'}
        activeLayerFeatureCount={features.filter((f) => f.layerId === activeLayerId).length}
        totalFeatureCount={features.length}
        onClearActiveLayer={handleClearActiveLayer}
        onClearAllFeatures={handleClearAllFeatures}
        onResetDemo={handleResetDemo}
      />
    </div>
  );

  return (
    <div className="w-screen h-screen bg-slate-200 dark:bg-gray-950 flex flex-col items-center justify-center overflow-hidden transition-colors duration-200">
      {/* 顶部微小模式切换器 (方便在电脑端开发和真机调试) */}
      <div className="fixed top-2 right-2 z-50 hidden md:flex items-center gap-2 px-3 py-1 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-slate-300 dark:border-gray-800 rounded-full text-[11px] text-slate-700 dark:text-gray-400">
        <button
          onClick={() => setDeviceFrameMode(!deviceFrameMode)}
          className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-white transition"
          title="切换手机真机外壳仿真模式"
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
        /* 📱 手机真机仿真外壳 (专为桌面端直观审查移动端交互打造) */
        <div className="relative w-[390px] h-[844px] max-h-[96vh] rounded-[48px] border-[10px] border-slate-800 dark:border-gray-800 bg-slate-100 dark:bg-gray-950 shadow-2xl shadow-blue-950/30 overflow-hidden flex flex-col ring-1 ring-black/10 dark:ring-white/10">
          {/* 手机灵动岛与听筒 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-gray-900 border border-gray-800 mr-2" />
            <div className="w-2 h-2 rounded-full bg-blue-900/60" />
          </div>
          {renderMobileAppContent()}
          {/* 底部小黑条 Home Indicator */}
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gray-600 rounded-full z-40" />
        </div>
      ) : (
        /* 📲 原生 100% 全屏移动端模式 (移动端浏览器或 WebView 下完美全屏贴合) */
        renderMobileAppContent()
      )}
    </div>
  );
};

export default App;
