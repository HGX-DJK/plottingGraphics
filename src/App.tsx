import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { User, PlotFeatureType, BasemapType } from './types';
import { authService } from './services/authService';
import { storageService, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from './services/storageService';
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
import { NewLayerModal } from './components/Modals/NewLayerModal';
import { ImportExportModal } from './components/Modals/ImportExportModal';
import { ClearFeaturesModal } from './components/Modals/ClearFeaturesModal';
import { MobilePoiSearchSheet } from './components/Mobile/MobilePoiSearchSheet';
import { AmapPoiItem } from './services/amapSearchService';
import { Smartphone, Monitor, Compass, Copy, ChevronDown } from 'lucide-react';
import { CoordinateFormat, formatCoordinates } from './utils/geoUtils';
import { ThemeMode, themeService } from './services/themeService';
import { copyToClipboard } from './utils/uiUtils';
import { useToast } from './hooks/useToast';
import { useLayers } from './hooks/useLayers';
import { useFeatures } from './hooks/useFeatures';

export const App: React.FC = () => {
  const mapRef = useRef<MaptalksContainerRef>(null);

  // 1. 全局轻量 Toast 反馈
  const { toastMessage, toastAction, setToastAction, showToast } = useToast();

  // 2. 全局明暗风格主题管理
  const [theme, setTheme] = useState<ThemeMode>(() => themeService.initTheme());
  const [basemap, setBasemap] = useState<BasemapType>(() =>
    themeService.getTheme() === 'light' ? 'street' : 'dark'
  );

  const handleToggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    themeService.setTheme(next);
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

  // 3. 用户会话管理
  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    authService.getCurrentUser()
  );

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setActiveTab(null);
  };

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
  const handleLocateFeature = (featureId: string) => {
    locateFeatureHook(
      featureId,
      (feat) => mapRef.current?.focusFeature(feat),
      () => setActiveTab(null)
    );
  };

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

  // 清除要素
  const handleClearActiveLayer = () => {
    handleClearFeatures(activeLayerId);
  };

  const handleClearAllFeatures = () => {
    handleClearFeatures();
  };

  // 导入与重置
  const handleImportData = (importedLayers: any[], importedFeatures: any[]) => {
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
  };

  const handleResetDemo = () => {
    const { layers: demoLayers, features: demoFeatures } = storageService.resetToDefault();
    const isolated = demoLayers.map((l, idx) => ({
      ...l,
      visible: idx === 0,
    }));
    resetLayers(isolated, demoLayers[0].id);
    resetFeatures(demoFeatures);
    showToast('已恢复初始演示态势，仅显示当前图层要素');
  };

  // 空间量算模式切换
  const handleToggleMeasureDistance = () => {
    if (drawingTool === 'measure-distance') {
      setDrawingTool(null);
    } else {
      setDrawingTool('measure-distance');
      setSelectedFeatureId(null);
      setActiveTab(null);
    }
    setMeasureResult(null);
    setDrawingPointsCount(0);
  };

  const handleToggleMeasureArea = () => {
    if (drawingTool === 'measure-area') {
      setDrawingTool(null);
    } else {
      setDrawingTool('measure-area');
      setSelectedFeatureId(null);
      setActiveTab(null);
    }
    setMeasureResult(null);
    setDrawingPointsCount(0);
  };

  const handleCancelDrawing = () => {
    setDrawingTool(null);
    setMeasureResult(null);
    setDrawingPointsCount(0);
  };

  // 8. 高德全国 POI 检索状态与基准定位
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userGpsCoord, setUserGpsCoord] = useState<[number, number] | null>(null);

  // 定位飞跃至检索地点
  const handleSelectPoiLocation = (coord: [number, number], title: string, subtitle: string) => {
    mapRef.current?.flyToLocation(coord, title, subtitle, 16.5);
    showToast(`📍 已精准定位至: ${title}`);
  };

  // 将搜索到的 POI 一键保存为当前图层的标绘点要素
  const handleSavePoiAsFeature = (poi: AmapPoiItem) => {
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
  };

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
      <MobileHeader onOpenSearch={() => setIsSearchOpen(true)} />

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
          onSelectFeature={(id) => {
            setSelectedFeatureId(id);
          }}
          onCreateFeature={(featData) => {
            handleCreateFeature(featData);
            setDrawingTool(null);
            setMeasureResult(null);
            setDrawingPointsCount(0);
          }}
          onCancelDrawing={handleCancelDrawing}
          onCoordinatesChange={(coords, zoom) => {
            setCursorCoords(coords);
            setZoomLevel(zoom);
          }}
          onDrawingPointsChange={setDrawingPointsCount}
          onMeasureResultChange={setMeasureResult}
          onTopologyWarning={setTopologyWarning}
          onActiveSegmentChange={setActiveSegment}
          onSnapFeedback={() => showToast('🧲 已吸附至相邻要素顶点')}
          onBearingChange={(b, p) => {
            setBearing(b);
            setPitch(p);
          }}
        />

        {/* 浮动工作图层选择胶囊 (左上角悬浮于搜索栏下方，轻量直观不占顶栏) */}
        {!drawingTool && (
          <div
            className="absolute left-3 z-20 pointer-events-auto flex items-center gap-1.5 h-8 pl-2.5 pr-2 rounded-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border border-slate-200/90 dark:border-white/10 shadow-md active:scale-95 transition cursor-pointer select-none max-w-[calc(100%-6rem)]"
            style={{ top: 'calc(max(env(safe-area-inset-top, 0px), 12px) + 3.25rem)' }}
            onClick={() => setActiveTab('layers')}
            title="点击切换工作图层"
            aria-label={`当前工作图层: ${activeLayer?.name || '默认工作图层'}，点击打开图层面板`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-2 ring-black/5 dark:ring-white/20"
              style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
            />
            <span className="text-[11px] font-bold text-slate-800 dark:text-gray-200 truncate tracking-tight">
              {activeLayer?.name || '默认工作图层'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500 shrink-0 ml-0.5" />
          </div>
        )}

        {/* 底部左侧：空间经纬度与比例尺徽章 */}
        {!drawingTool && !selectedFeature && (
          <div
            onClick={handleCycleCoordinateFormat}
            className="absolute bottom-[68px] left-3 z-10 pointer-events-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border border-slate-200/90 dark:border-white/10 shadow-lg text-slate-700 dark:text-gray-300 font-mono text-[10px] active:scale-95 transition cursor-pointer select-none max-w-[calc(100%-60px)]"
            title="点击切换坐标系统 (DD / DMS / EPSG:3857)"
          >
            <Compass className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
            <span className="truncate">
              {formatCoordinates(cursorCoords, coordinateFormat, 4)}
            </span>
            <span className="text-[9px] px-1 py-0.5 rounded bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-gray-400 shrink-0">
              {coordinateFormat}
            </span>
            <button
              onClick={handleCopyCoordinates}
              className="p-1 hover:text-blue-600 dark:hover:text-blue-400 active:scale-90 transition shrink-0 ml-0.5"
              title="复制当前经纬度"
            >
              <Copy className="w-3 h-3 text-slate-400 dark:text-gray-500" />
            </button>
          </div>
        )}

        {/* 3. 移动端浮动控制面板 (标绘中状态控制条) */}
        <MobileDrawingControls
          drawingTool={drawingTool}
          drawingPointsCount={drawingPointsCount}
          bearing={bearing}
          measureResult={measureResult}
          enableSnapping={enableSnapping}
          topologyWarning={topologyWarning}
          activeSegment={activeSegment}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          hasSelectedFeature={!!selectedFeature && !drawingTool && activeTab !== 'properties'}
          onCancelDrawing={handleCancelDrawing}
          onUndoPoint={() => mapRef.current?.undoPoint()}
          onFinishDrawing={() => mapRef.current?.finishCurrentDrawing()}
          onUndoMeasurePoint={() => mapRef.current?.undoMeasurePoint()}
          onClearMeasure={() => mapRef.current?.clearMeasure()}
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onResetView={() => mapRef.current?.resetView()}
          onResetNorth={() => mapRef.current?.resetNorth()}
          onToggleSnapping={() => {
            const next = !enableSnapping;
            setEnableSnapping(next);
            showToast(next ? '🧲 顶点吸附已开启 (CAD/GIS精度)' : '⚪ 顶点吸附已关闭');
          }}
          onToggleMeasureDistance={handleToggleMeasureDistance}
          onToggleMeasureArea={handleToggleMeasureArea}
          onLocateGPS={handleLocateGPS}
          onOpenClearFeatures={() => setIsClearModalOpen(true)}
        />

        {/* 要素快览悬浮卡片 */}
        {selectedFeature && !drawingTool && activeTab !== 'properties' && (
          <MobileFeatureQuickCard
            feature={selectedFeature}
            layer={layers.find((l) => l.id === selectedFeature.layerId)}
            onFocus={() => handleLocateFeature(selectedFeature.id)}
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
      {/* 图层管理抽屉 */}
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
        onSelectFeature={handleLocateFeature}
        onLocateFeature={handleLocateFeature}
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
        onSelectFeature={handleLocateFeature}
        onLocateFeature={handleLocateFeature}
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

      {/* 「我的」面板抽屉 (账号资料 / 偏好设置 / 数据管理) */}
      <MobileMoreSheet
        isOpen={activeTab === 'more'}
        onClose={() => setActiveTab(null)}
        currentUser={currentUser}
        basemap={basemap}
        onChangeBasemap={(mb) => {
          setBasemap(mb);
          showToast(`底图已切换为「${mb === 'dark' ? '暗夜科技' : mb === 'satellite' ? '遥感卫星' : '现代街道'}」`);
        }}
        onOpenImportExport={() => {
          setActiveTab(null);
          setIsImportExportModalOpen(true);
        }}
        onOpenSearch={() => {
          setActiveTab(null);
          setIsSearchOpen(true);
        }}
        onResetDemo={handleResetDemo}
        onLogout={handleLogout}
        theme={theme}
        onSelectTheme={handleSelectTheme}
      />

      {/* 6. 模态弹窗群 */}
      <NewLayerModal
        isOpen={isNewLayerModalOpen}
        onClose={() => setIsNewLayerModalOpen(false)}
        onCreateLayer={handleCreateLayer}
      />

      <ClearFeaturesModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        activeLayerName={activeLayer?.name || '当前工作图层'}
        activeLayerColor={activeLayer?.color || '#3b82f6'}
        activeLayerFeatureCount={features.filter((f) => f.layerId === activeLayerId).length}
        totalFeatureCount={features.length}
        onClearActiveLayer={handleClearActiveLayer}
        onClearAllFeatures={handleClearAllFeatures}
        onResetDemo={handleResetDemo}
      />

      <ImportExportModal
        isOpen={isImportExportModalOpen}
        onClose={() => setIsImportExportModalOpen(false)}
        layers={layers}
        features={features}
        onImportData={handleImportData}
        onResetDemo={handleResetDemo}
      />

      {/* 7. 全国 POI 地名/地址检索抽屉 */}
      <MobilePoiSearchSheet
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentCenter={cursorCoords}
        userGpsCoord={userGpsCoord}
        activeLayer={activeLayer}
        features={features}
        layers={layers}
        onSelectLocation={handleSelectPoiLocation}
        onSaveAsFeature={handleSavePoiAsFeature}
        onNotify={showToast}
      />
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
