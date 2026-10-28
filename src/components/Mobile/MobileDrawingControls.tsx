import React from 'react';
import { PlotFeatureType } from '../../types';
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
} from 'lucide-react';
import { formatDistance } from '../../utils/geoUtils';

interface MobileDrawingControlsProps {
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  drawingPointsCount: number;
  bearing?: number;
  enableSnapping?: boolean;
  topologyWarning?: string | null;
  activeSegment?: { length: number; azimuth: { degrees: number; text: string } } | null;
  onCancelDrawing: () => void;
  onUndoPoint?: () => void;
  onFinishDrawing?: () => void;
  onToggleSnapping?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onResetNorth?: () => void;
  onOpenClearFeatures?: () => void;
  onToggleMeasureDistance: () => void;
  onToggleMeasureArea: () => void;
  onLocateGPS?: () => void;
  hasSelectedFeature?: boolean;
}

export const MobileDrawingControls: React.FC<MobileDrawingControlsProps> = ({
  drawingTool,
  drawingPointsCount,
  bearing = 0,
  enableSnapping = true,
  topologyWarning,
  activeSegment,
  onCancelDrawing,
  onUndoPoint,
  onFinishDrawing,
  onToggleSnapping,
  onZoomIn,
  onZoomOut,
  onResetView,
  onResetNorth,
  onOpenClearFeatures,
  onToggleMeasureDistance,
  onToggleMeasureArea,
  onLocateGPS,
  hasSelectedFeature = false,
}) => {
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
    if (tool === 'polyline' || tool === 'polygon' || tool === 'freehand' || tool === 'measure-distance' || tool === 'measure-area') {
      return `已添加 ${count} 个顶点 (双击或点完成)`;
    }
    return '轻触地图落点';
  };

  const canFinish =
    drawingTool === 'polyline' || drawingTool === 'freehand'
      ? drawingPointsCount >= 2
      : drawingTool === 'polygon' || drawingTool === 'measure-area'
      ? drawingPointsCount >= 3
      : false;

  return (
    <>
      {/* 顶部标绘状态指示条 (仅在标绘或量算交互模式时显示) */}
      {drawingTool && (
        <div className="absolute top-14 left-3 right-3 z-30 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-gray-900/95 backdrop-blur-md border border-blue-500/50 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-blue-300 truncate">
                {getToolDisplayName(drawingTool)}
              </div>
              <div className="text-[10px] text-gray-300 truncate">
                {getRequiredPointsText(drawingTool, drawingPointsCount)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onToggleSnapping && (
              <button
                onClick={onToggleSnapping}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                  enableSnapping
                    ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-gray-800/80 text-gray-400 border border-gray-700/60'
                }`}
                title="智能顶点磁吸吸附"
              >
                <Magnet className={`w-3.5 h-3.5 ${enableSnapping ? 'text-cyan-400' : 'text-gray-500'}`} />
                <span>吸附{enableSnapping ? '开' : '关'}</span>
              </button>
            )}

            {drawingPointsCount > 0 && onUndoPoint && (
              <button
                onClick={onUndoPoint}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-gray-800 text-gray-300 active:bg-gray-700 text-xs font-medium transition"
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

            <button
              onClick={onCancelDrawing}
              className="p-1.5 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition"
              title="退出标绘"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 拓扑规范警示提示条 */}
      {drawingTool && topologyWarning && (
        <div className="absolute top-28 left-3 right-3 z-30 flex items-center gap-2 p-2.5 rounded-xl bg-red-950/95 border border-red-500/60 text-red-200 text-xs font-semibold backdrop-blur-md shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
          <span className="truncate">{topologyWarning}</span>
        </div>
      )}

      {/* 底部显眼完成控制条 (触屏单手交互优化，免除双击与盲点) */}
      {drawingTool && (
        <div className="absolute bottom-20 left-3 right-3 z-30 flex items-center justify-between gap-2.5 p-3 rounded-2xl bg-gray-950/95 backdrop-blur-xl border border-blue-500/50 shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-blue-400 font-mono">
                {drawingPointsCount}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-gray-100 truncate">
                {getToolDisplayName(drawingTool)}
              </div>
              <div className="text-[10px] text-gray-400 truncate mt-0.5">
                {activeSegment ? (
                  <span className="text-cyan-300 font-mono font-medium">
                    当前边: {formatDistance(activeSegment.length)} | 方位角: {activeSegment.azimuth.text}
                  </span>
                ) : canFinish ? (
                  '已满足闭合条件，点击右侧完成保存'
                ) : (
                  getRequiredPointsText(drawingTool, drawingPointsCount)
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {drawingPointsCount > 0 && onUndoPoint && (
              <button
                onClick={onUndoPoint}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-800 text-gray-200 active:bg-gray-700 text-xs font-semibold border border-gray-700 transition"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>撤回</span>
              </button>
            )}

            {canFinish ? (
              <button
                onClick={onFinishDrawing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 active:from-emerald-700 active:to-green-700 text-white text-xs font-black shadow-lg shadow-emerald-600/30 animate-pulse transition"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>完成保存</span>
              </button>
            ) : (
              <button
                onClick={onCancelDrawing}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-800/80 text-gray-400 active:text-white text-xs font-medium transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>取消</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 右侧悬浮移动端 GIS 交互工具组 (模块化整合设计，当选中要素时智能抬升避让，彻底避免遮挡) */}
      <div
        className={`absolute right-3 z-20 flex flex-col gap-2.5 transition-all duration-300 ${
          drawingTool ? 'bottom-44' : hasSelectedFeature ? 'bottom-[180px]' : 'bottom-[102px]'
        }`}
      >
        {/* 1. 空间量算双功能模块 (测距 / 测面) */}
        <div className="flex flex-col bg-white/90 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
          <button
            onClick={onToggleMeasureDistance}
            className={`w-10 h-10 flex items-center justify-center transition border-b border-slate-200/80 dark:border-white/10 ${
              drawingTool === 'measure-distance'
                ? 'bg-amber-500 text-gray-950 font-bold shadow-inner'
                : 'text-slate-700 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 hover:text-blue-600 dark:hover:text-white'
            }`}
            title="空间折线测距 (Distance)"
          >
            <Ruler className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleMeasureArea}
            className={`w-10 h-10 flex items-center justify-center transition ${
              drawingTool === 'measure-area'
                ? 'bg-emerald-500 text-gray-950 font-bold shadow-inner'
                : 'text-slate-700 dark:text-gray-300 active:bg-slate-100 dark:active:bg-gray-800/80 hover:text-blue-600 dark:hover:text-white'
            }`}
            title="空间多边形测面 (Area)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* 2. 地图视图控制模块 (物理动态指北针 + 全景复位 + GPS定位 + 缩放控制 + 清空地图要素) */}
        <div className="flex flex-col bg-white/90 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden">
          {onResetNorth && (
            <button
              onClick={onResetNorth}
              className={`w-10 h-10 flex flex-col items-center justify-center border-b border-slate-200/80 dark:border-white/10 active:bg-slate-100 dark:active:bg-gray-800/80 transition relative ${
                Math.abs(bearing) > 0.5 ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-300 shadow-inner' : 'text-slate-700 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
              }`}
              title={`当前地图朝向: ${Math.round(((bearing % 360) + 360) % 360)}° (点击一键复位正北)`}
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
          )}

          <button
            onClick={onResetView}
            className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-blue-400 active:bg-slate-100 dark:active:bg-gray-800/80 border-b border-slate-200/80 dark:border-white/10 transition"
            title="复位全景范围"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {onLocateGPS && (
            <button
              onClick={onLocateGPS}
              className="w-10 h-10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 active:bg-slate-100 dark:active:bg-gray-800/80 border-b border-slate-200/80 dark:border-white/10 transition"
              title="GPS 实时设备定位"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onZoomIn}
            className="w-10 h-10 flex items-center justify-center text-slate-700 dark:text-gray-200 active:bg-slate-100 dark:active:bg-gray-800/80 border-b border-slate-200/80 dark:border-white/10 transition"
            title="放大"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={onZoomOut}
            className={`w-10 h-10 flex items-center justify-center text-slate-700 dark:text-gray-200 active:bg-slate-100 dark:active:bg-gray-800/80 transition ${
              onOpenClearFeatures ? 'border-b border-slate-200/80 dark:border-white/10' : ''
            }`}
            title="缩小"
          >
            <Minus className="w-4 h-4" />
          </button>

          {/* 清除地图要素按钮 */}
          {onOpenClearFeatures && (
            <button
              onClick={onOpenClearFeatures}
              className="w-10 h-10 flex items-center justify-center text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 active:bg-red-50 dark:active:bg-red-950/40 transition"
              title="清空地图要素 (Clear Features)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
};
