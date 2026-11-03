import React, { useEffect, useRef, useState } from 'react';
import { PlotFeatureType } from '../../types';
import { ThemeMode } from '../../services/themeService';
import type { MeasureResult } from '../Map/MaptalksContainer';
import {
  Plus,
  Minus,
  Crosshair,
  Ruler,
  Maximize2,
  Undo2,
  Check,
  X,
  Navigation,
  Magnet,
  Compass,
  AlertTriangle,
  Trash2,
  Eraser,
  SlidersHorizontal,
  Sun,
  Moon,
  Image as ImageIcon,
  Target,
} from 'lucide-react';
import { formatDistance } from '../../utils/geoUtils';

interface MobileDrawingControlsProps {
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  drawingPointsCount: number;
  bearing?: number;
  enableSnapping?: boolean;
  topologyWarning?: string | null;
  activeSegment?: { length: number; azimuth: { degrees: number; text: string } } | null;
  measureResult?: MeasureResult | null;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onCancelDrawing: () => void;
  onUndoPoint?: () => void;
  onFinishDrawing?: () => void;
  onUndoMeasurePoint?: () => void;
  onClearMeasure?: () => void;
  onToggleSnapping?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onResetNorth?: () => void;
  onOpenClearFeatures?: () => void;
  onToggleMeasureDistance: () => void;
  onToggleMeasureArea: () => void;
  onLocateGPS?: () => void;
  onExportPoster?: () => void;
  hasSelectedFeature?: boolean;
  onAddCenterPoint?: () => void;
  cursorCoords?: [number, number];
}

const MobileDrawingControlsBase: React.FC<MobileDrawingControlsProps> = ({
  drawingTool,
  drawingPointsCount,
  bearing = 0,
  enableSnapping = true,
  topologyWarning,
  activeSegment,
  measureResult = null,
  theme = 'dark',
  onToggleTheme,
  onCancelDrawing,
  onUndoPoint,
  onFinishDrawing,
  onUndoMeasurePoint,
  onClearMeasure,
  onToggleSnapping,
  onZoomIn,
  onZoomOut,
  onResetView,
  onResetNorth,
  onOpenClearFeatures,
  onToggleMeasureDistance,
  onToggleMeasureArea,
  onLocateGPS,
  onExportPoster,
  hasSelectedFeature = false,
  onAddCenterPoint,
  cursorCoords,
}) => {
  // 屏幕中心十字准星模式状态 (解决移动端手指遮挡痛点，行业标杆测绘体验)
  const [reticleMode, setReticleMode] = useState<boolean>(true);
  const getToolDisplayName = (tool: string) => {
    const names: Record<string, string> = {
      'straight-arrow': '规划导向直箭头',
      'attack-arrow': '空间发展推进轴',
      'pincer-arrow': '双向分流与汇聚标绘',
      'gathering-place': '重点管控集结区',
      'sector': '监测覆盖扇区',
      'polyline': '路线走向 / 勘界折线',
      'polygon': '规划控制地块面',
      'rectangle': '标准搜索网格 (BBox)',
      'circle': '缓冲区安全半径圈',
      'marker': '空间位置标定点',
      'text': '空间地物文字注记',
      'freehand': '外业踏勘手绘轨迹',
      'point-survey': '控制测量核查点',
      'point-station': '生态环境监测站',
      'point-facility': '市政基础设施点',
      'point-hazard': '地灾风险隐患点',
      'point-medical': '应急医疗避难点',
      'measure-distance': '空间折线测距',
      'measure-area': '空间多边形测面',
    };
    if (tool.startsWith('post-')) return '专题地物标号';
    return names[tool] || tool;
  };

  const getRequiredPointsText = (tool: string, count: number) => {
    if (tool === 'straight-arrow' || tool === 'circle' || tool === 'sector' || tool === 'rectangle') {
      return `已点标 ${count}/2 点`;
    }
    if (tool === 'attack-arrow' || tool === 'pincer-arrow' || tool === 'gathering-place') {
      return `已点标 ${count}/3 点`;
    }
    if (tool === 'measure-distance') {
      return `已落 ${count} 个点 · 至少 2 点可读总长`;
    }
    if (tool === 'measure-area') {
      return `已落 ${count} 个点 · 至少 3 点可读面积`;
    }
    if (tool === 'polyline' || tool === 'freehand') {
      return count >= 2
        ? `已采 ${count} 个顶点 (可继续点标或点完成)`
        : `已点标 ${count}/2 点 · 至少需 2 点`;
    }
    if (tool === 'polygon') {
      return count >= 3
        ? `已采 ${count} 个顶点 (可继续添加或点起点闭合)`
        : `已采 ${count}/3 个顶点 · 至少需 3 点`;
    }
    return '轻触地图落点';
  };

  // 空间量算模式：无需「完成保存」，只提供读数、撤回与重测
  const isMeasureMode = drawingTool === 'measure-distance' || drawingTool === 'measure-area';

  const canFinish = isMeasureMode
    ? false
    : drawingTool === 'polyline' || drawingTool === 'freehand'
    ? drawingPointsCount >= 2
    : drawingTool === 'polygon'
    ? drawingPointsCount >= 3
    : false;

  // 量算读数主文案
  const measureReadout = measureResult?.text ?? '—';
  const measureUnitLabel = measureResult?.kind === 'area' ? '量算面积' : '量算总长';

  // 更多工具浮层：把低频与破坏性操作从常驻工具条中收起，保持地图右侧清爽
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreToolsOpen) return;
    /**
     * 用 pointerdown 而不是 mousedown：
     * 触屏上 mousedown 要等 touchend 之后才由浏览器合成，
     * 「更多工具」浮层会在手指抬起后才延迟关闭，手感很差。
     * Pointer Events 统一了鼠标 / 触摸 / 手写笔三条路径。
     */
    const handlePointerDown = (e: PointerEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setMoreToolsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreToolsOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreToolsOpen]);

  return (
    <>
      {/* 顶部标绘状态指示条 (仅在标绘或量算交互模式时显示)
          位置基于安全区计算：始终位于顶部胶囊下方，刘海屏设备同样不会互相遮挡 */}
      {drawingTool && (
        <div
          className="absolute left-3 right-3 z-30 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-blue-500/50 shadow-2xl animate-in slide-in-from-top-4 duration-200"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 4.25rem)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
                isMeasureMode
                  ? 'bg-amber-500 dark:bg-amber-400'
                  : 'bg-blue-500 dark:bg-blue-400'
              }`}
            />
            <div className="min-w-0">
              <div
                className={`text-xs font-bold truncate ${
                  isMeasureMode
                    ? 'text-amber-600 dark:text-amber-300'
                    : 'text-blue-600 dark:text-blue-300'
                }`}
              >
                {getToolDisplayName(drawingTool)}
              </div>
              <div className="text-[10px] text-slate-600 dark:text-gray-300 truncate">
                {isMeasureMode ? (
                  <span className="font-mono">
                    {drawingPointsCount > 0
                      ? `读数 ${measureReadout} · 已落 ${drawingPointsCount} 个点`
                      : getRequiredPointsText(drawingTool, drawingPointsCount)}
                  </span>
                ) : (
                  getRequiredPointsText(drawingTool, drawingPointsCount)
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 准星模式 / 触屏直按模式切换 */}
            <button
              onClick={() => {
                const next = !reticleMode;
                setReticleMode(next);
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(20);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                reticleMode
                  ? 'bg-amber-50 dark:bg-amber-600/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-500/50'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700/60'
              }`}
              title="切换中心十字准星标定模式与触屏直接点选模式"
            >
              <Target
                className={`w-3.5 h-3.5 ${
                  reticleMode ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-gray-500'
                }`}
              />
              <span>{reticleMode ? '准星模式' : '触控模式'}</span>
            </button>

            {!isMeasureMode && onToggleSnapping && (
              <button
                onClick={onToggleSnapping}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                  enableSnapping
                    ? 'bg-cyan-50 dark:bg-cyan-600/30 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/50'
                    : 'bg-slate-100 dark:bg-gray-800/80 text-slate-500 dark:text-gray-400 border border-slate-200 dark:border-gray-700/60'
                }`}
                title="智能顶点磁吸吸附"
              >
                <Magnet className={`w-3.5 h-3.5 ${enableSnapping ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 dark:text-gray-500'}`} />
                <span>吸附{enableSnapping ? '开' : '关'}</span>
              </button>
            )}

            {isMeasureMode ? (
              <>
                {drawingPointsCount > 0 && onUndoMeasurePoint && (
                  <button
                    onClick={onUndoMeasurePoint}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 active:bg-slate-200 dark:active:bg-gray-700 text-xs font-medium transition"
                    title="撤回上一个量算点"
                    aria-label="撤回上一个量算点"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>撤回</span>
                  </button>
                )}
                {drawingPointsCount > 0 && onClearMeasure && (
                  <button
                    onClick={onClearMeasure}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-500/40 text-xs font-medium transition"
                    title="清空量算点重新测量"
                    aria-label="清空量算点并重新测量"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>重测</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {drawingPointsCount > 0 && onUndoPoint && (
                  <button
                    onClick={onUndoPoint}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 active:bg-slate-200 dark:active:bg-gray-700 text-xs font-medium transition"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>撤回</span>
                  </button>
                )}

                {canFinish && onFinishDrawing && (
                  <button
                    onClick={onFinishDrawing}
                    className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 text-white active:bg-emerald-500 text-xs font-bold shadow transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>完成</span>
                  </button>
                )}
              </>
            )}

            <button
              onClick={onCancelDrawing}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-500 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition"
              title="退出标绘"
              aria-label="退出标绘模式"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 拓扑规范警示提示条 (位于标绘状态条下方，二者不重叠) */}
      {drawingTool && topologyWarning && (
        <div
          className="absolute left-3 right-3 z-30 flex items-center gap-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/95 border border-red-300 dark:border-red-500/60 text-red-700 dark:text-red-200 text-xs font-semibold backdrop-blur-md shadow-2xl animate-in slide-in-from-top-2 duration-200"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 8rem)' }}
        >
          <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 animate-pulse" />
          <span className="truncate">{topologyWarning}</span>
        </div>
      )}

      {/* 屏幕中心高精度十字准星 (Crosshair Reticle，解决移动端粗手指遮挡痛点) */}
      {drawingTool && reticleMode && (
        <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center select-none">
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* 水平十字丝 (中心留白) */}
            <div className="absolute left-0 w-6 h-[1.5px] bg-amber-500 dark:bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
            <div className="absolute right-0 w-6 h-[1.5px] bg-amber-500 dark:bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />

            {/* 垂直十字丝 (中心留白) */}
            <div className="absolute top-0 h-6 w-[1.5px] bg-amber-500 dark:bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />
            <div className="absolute bottom-0 h-6 w-[1.5px] bg-amber-500 dark:bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.6)]" />

            {/* 瞄准准星环 (中心开孔留空，彻底避免遮挡目标地物) */}
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 dark:border-amber-400 flex items-center justify-center bg-black/10 backdrop-blur-[0.5px] shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 animate-ping opacity-75" />
              <div className="absolute w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-300" />
            </div>

            {/* 准星四角精密测绘角标 (CAD 级标定十字丝) */}
            <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-amber-500/60" />
            <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-amber-500/60" />
            <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-amber-500/60" />
            <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-amber-500/60" />

            {/* 准星下方微型坐标与落点引导标签 */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-amber-400 text-[9px] font-mono font-bold whitespace-nowrap shadow-lg border border-amber-500/30 flex items-center gap-1">
              <Crosshair className="w-2.5 h-2.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{cursorCoords ? `${cursorCoords[0].toFixed(5)}°, ${cursorCoords[1].toFixed(5)}°` : '移动地图对准地物'}</span>
            </div>
          </div>
        </div>
      )}

      {/* 底部显眼完成控制条 (触屏单手交互优化，免除双击与盲点)
          底部偏移按安全区计算，避免与 TabBar 及 Home Indicator 重叠 */}
      {drawingTool && (
        <div
          className="absolute left-3 right-3 z-30 flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border border-blue-500/40 dark:border-blue-500/50 shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                isMeasureMode
                  ? 'bg-amber-50 dark:bg-amber-500/20 border-amber-200 dark:border-amber-500/40'
                  : 'bg-blue-50 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500/40'
              }`}
            >
              <span
                className={`text-xs font-black font-mono ${
                  isMeasureMode
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-blue-600 dark:text-blue-400'
                }`}
              >
                {drawingPointsCount}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate">
                {getToolDisplayName(drawingTool)}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                {isMeasureMode ? (
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-300">
                    {drawingPointsCount > 0 ? `${measureUnitLabel}: ${measureReadout}` : '轻触地图落点开始量算'}
                  </span>
                ) : activeSegment ? (
                  <span className="text-cyan-600 dark:text-cyan-300 font-mono font-medium">
                    当前边: {formatDistance(activeSegment.length)} | 方位角: {activeSegment.azimuth.text}
                  </span>
                ) : canFinish ? (
                  drawingTool === 'polygon'
                    ? `已采 ${drawingPointsCount} 点 · 可继续落点/点起点闭合/完成保存`
                    : `已采 ${drawingPointsCount} 点 · 可继续落点或完成保存`
                ) : (
                  getRequiredPointsText(drawingTool, drawingPointsCount)
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isMeasureMode ? (
              <>
                {reticleMode && onAddCenterPoint && (
                  <button
                    onClick={() => {
                      onAddCenterPoint();
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
                    }}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 active:scale-95 text-white text-xs font-black shadow-md shadow-orange-500/25 transition cursor-pointer"
                    title="在屏幕中心十字准星处采集量算点"
                  >
                    <Target className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>准星落点</span>
                  </button>
                )}
                {drawingPointsCount > 0 && onUndoMeasurePoint && (
                  <button
                    onClick={onUndoMeasurePoint}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 active:bg-slate-200 dark:active:bg-gray-700 text-xs font-semibold border border-slate-200 dark:border-gray-700 transition"
                    title="撤回上一个量算点"
                    aria-label="撤回上一个量算点"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>撤回</span>
                  </button>
                )}
                {drawingPointsCount > 0 && onClearMeasure && (
                  <button
                    onClick={onClearMeasure}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 active:from-rose-600 active:to-red-700 text-white text-xs font-black shadow-lg shadow-rose-600/30 transition active:scale-[0.97]"
                    title="清空量算点并重新测量"
                    aria-label="清空量算点并重新测量"
                  >
                    <Eraser className="w-4 h-4 stroke-[3]" />
                    <span>清除重测</span>
                  </button>
                )}
                {drawingPointsCount === 0 && (
                  <button
                    onClick={onCancelDrawing}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-800/80 text-slate-500 active:text-slate-800 dark:text-gray-400 dark:active:text-white text-xs font-medium transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>取消</span>
                  </button>
                )}
              </>
            ) : (
              <>
                {drawingPointsCount > 0 && onUndoPoint && (
                  <button
                    onClick={onUndoPoint}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 active:bg-slate-200 dark:active:bg-gray-700 text-xs font-semibold border border-slate-200 dark:border-gray-700 transition"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>撤回</span>
                  </button>
                )}

                {reticleMode && onAddCenterPoint && (
                  <button
                    onClick={() => {
                      onAddCenterPoint();
                      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 active:scale-95 text-white text-xs font-black shadow-lg shadow-orange-500/30 transition cursor-pointer border border-amber-300/40"
                    title="在屏幕中心十字准星处采集标绘顶点"
                  >
                    <Target className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>准星落点</span>
                  </button>
                )}

                {canFinish ? (
                  <button
                    onClick={onFinishDrawing}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 active:from-emerald-700 active:to-green-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition active:scale-[0.97]"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>完成保存</span>
                  </button>
                ) : (
                  <button
                    onClick={onCancelDrawing}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-800/80 text-slate-500 active:text-slate-800 dark:text-gray-400 dark:active:text-white text-xs font-medium transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>取消</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 右侧悬浮移动端 GIS 交互工具条
          常驻只保留高频操作：指南针（仅在地图偏离正北时出现）、GPS 定位、放大、缩小、更多工具。
          测距 / 测面 / 复位全景 / 清空要素 等低频与破坏性操作收进「更多工具」浮层，
          既让右侧保持清爽，也顺带让这些功能带上文字标签、更易识别。 */}
      <div
        ref={toolsRef}
        className="absolute right-3 z-20 flex flex-col items-end gap-2 transition-all duration-300"
        style={{
          bottom: `calc(env(safe-area-inset-bottom, 0px) + ${
            drawingTool ? '11.5rem' : hasSelectedFeature ? '11.5rem' : '6.5rem'
          })`,
        }}
      >
        {/* 更多工具浮层：收纳低频与破坏性操作 */}
        {moreToolsOpen && (
          <div
            role="menu"
            aria-label="更多地图工具"
            className="absolute right-full mr-2 bottom-0 w-[172px] rounded-2xl bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          >
            <button
              role="menuitem"
              onClick={() => {
                setMoreToolsOpen(false);
                onToggleMeasureDistance();
              }}
              className={`w-full flex items-center gap-2.5 h-11 px-3 text-left transition ${
                drawingTool === 'measure-distance'
                  ? 'bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  : 'text-slate-700 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80'
              }`}
              title="空间折线测距 (Distance)"
              aria-label="空间折线测距"
              aria-pressed={drawingTool === 'measure-distance'}
            >
              <Ruler className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold truncate">空间测距</span>
            </button>

            <button
              role="menuitem"
              onClick={() => {
                setMoreToolsOpen(false);
                onToggleMeasureArea();
              }}
              className={`w-full flex items-center gap-2.5 h-11 px-3 text-left transition border-t border-slate-200/70 dark:border-white/10 ${
                drawingTool === 'measure-area'
                  ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-700 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80'
              }`}
              title="空间多边形测面 (Area)"
              aria-label="空间多边形测面"
              aria-pressed={drawingTool === 'measure-area'}
            >
              <Maximize2 className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold truncate">空间测面</span>
            </button>

            <button
              role="menuitem"
              onClick={() => {
                setMoreToolsOpen(false);
                onResetView();
              }}
              className="w-full flex items-center gap-2.5 h-11 px-3 text-left text-slate-700 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 transition border-t border-slate-200/70 dark:border-white/10"
              title="复位全景范围"
              aria-label="复位全景范围"
            >
              <Crosshair className="w-4 h-4 shrink-0" />
              <span className="text-xs font-semibold truncate">复位全景</span>
            </button>

            {onExportPoster && (
              <button
                role="menuitem"
                onClick={() => {
                  setMoreToolsOpen(false);
                  onExportPoster();
                }}
                className="w-full flex items-center gap-2.5 h-11 px-3 text-left text-blue-600 dark:text-blue-400 active:bg-blue-50 dark:active:bg-blue-950/40 transition border-t border-slate-200/70 dark:border-white/10"
                title="导出高清标绘成果大图"
                aria-label="导出高清标绘成果大图"
              >
                <ImageIcon className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold truncate">导出成果大图</span>
              </button>
            )}

            {onToggleTheme && (
              <button
                role="menuitem"
                onClick={() => {
                  setMoreToolsOpen(false);
                  onToggleTheme();
                }}
                className="w-full flex items-center gap-2.5 h-11 px-3 text-left text-slate-700 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 transition border-t border-slate-200/70 dark:border-white/10"
                title={theme === 'dark' ? '切换为清新浅色模式' : '切换为极夜暗色模式'}
                aria-label="切换界面明暗风格"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                )}
                <span className="text-xs font-semibold truncate">
                  {theme === 'dark' ? '切换清新浅色' : '切换极夜暗色'}
                </span>
              </button>
            )}

            {onOpenClearFeatures && (
              <button
                role="menuitem"
                onClick={() => {
                  setMoreToolsOpen(false);
                  onOpenClearFeatures();
                }}
                className="w-full flex items-center gap-2.5 h-11 px-3 text-left text-rose-500 dark:text-rose-400 active:bg-rose-50 dark:active:bg-rose-950/40 transition border-t border-slate-200/70 dark:border-white/10"
                title="清空地图要素 (Clear Features)"
                aria-label="清空地图要素"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span className="text-xs font-semibold truncate">清空要素</span>
              </button>
            )}
          </div>
        )}

        {/* 指南针：仅在地图偏离正北时出现，正北朝上时不占常驻位 */}
        {onResetNorth && Math.abs(bearing) > 0.5 && (
          <div className="flex flex-col bg-white/90 dark:bg-gray-950/85 backdrop-blur-xl border border-cyan-200/90 dark:border-cyan-500/30 rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-black/40 overflow-hidden">
            <button
              onClick={onResetNorth}
              className="w-11 h-11 flex flex-col items-center justify-center bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 active:bg-cyan-100 dark:active:bg-cyan-900/50 transition relative shadow-inner"
              title={`当前地图朝向: ${Math.round(((bearing % 360) + 360) % 360)}° (点击一键复位正北)`}
              aria-label="一键复位正北"
            >
              {/* 物理真实动态指南针磁针 (跟随地图旋转角动态转动) */}
              <div
                className="relative w-5 h-5 flex items-center justify-center pointer-events-none transition-transform duration-100 ease-out"
                style={{ transform: `rotate(${-bearing}deg)` }}
              >
                {/* 北极红色磁针 */}
                <div className="absolute top-0.5 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[8px] border-b-red-500" />
                {/* 南极浅灰磁针 */}
                <div className="absolute bottom-0.5 w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[8px] border-t-gray-400 dark:border-t-gray-300" />
                {/* 轴心点 */}
                <div className="w-1.5 h-1.5 rounded-full bg-slate-800 dark:bg-white z-10 shadow-sm" />
              </div>
              {Math.abs(bearing) > 2 && (
                <span className="text-[7.5px] font-bold text-cyan-600 dark:text-cyan-400 font-mono -mt-0.5 leading-none">
                  {Math.round(((bearing % 360) + 360) % 360)}°
                </span>
              )}
            </button>
          </div>
        )}

        {/* 视图组：GPS 定位 / 放大 / 缩小 */}
        <div className="flex flex-col bg-white/90 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-black/40 overflow-hidden">
          {onLocateGPS && (
            <button
              onClick={onLocateGPS}
              className="w-11 h-11 flex items-center justify-center text-slate-600 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 border-b border-slate-200/80 dark:border-white/10 transition"
              title="GPS 实时设备定位"
              aria-label="GPS 实时设备定位"
            >
              <Navigation className="w-[18px] h-[18px]" />
            </button>
          )}

          <button
            onClick={onZoomIn}
            className="w-11 h-11 flex items-center justify-center text-slate-600 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 border-b border-slate-200/80 dark:border-white/10 transition"
            title="放大"
            aria-label="地图放大"
          >
            <Plus className="w-[18px] h-[18px]" />
          </button>

          <button
            onClick={onZoomOut}
            className="w-11 h-11 flex items-center justify-center text-slate-600 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 transition"
            title="缩小"
            aria-label="地图缩小"
          >
            <Minus className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* 更多工具入口 */}
        <div className="flex flex-col bg-white/90 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-black/40 overflow-hidden">
          <button
            onClick={() => setMoreToolsOpen((v) => !v)}
            className={`w-11 h-11 flex items-center justify-center transition ${
              moreToolsOpen
                ? 'bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300'
                : 'text-slate-600 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80'
            }`}
            title="更多地图工具"
            aria-label="更多地图工具"
            aria-expanded={moreToolsOpen}
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </>
  );
};

/**
 * 记忆化包装：上层组件的无关状态变化（如视口中心、缩放级别刷新）
 * 不再触发本组件整体重渲染，避免移动端无谓的整树 diff 开销。
 */
export const MobileDrawingControls = React.memo(MobileDrawingControlsBase);
