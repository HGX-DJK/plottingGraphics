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
} from 'lucide-react';

interface MobileDrawingControlsProps {
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  drawingPointsCount: number;
  onCancelDrawing: () => void;
  onUndoPoint?: () => void;
  onFinishDrawing?: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onToggleMeasureDistance: () => void;
  onToggleMeasureArea: () => void;
}

export const MobileDrawingControls: React.FC<MobileDrawingControlsProps> = ({
  drawingTool,
  drawingPointsCount,
  onCancelDrawing,
  onUndoPoint,
  onFinishDrawing,
  onZoomIn,
  onZoomOut,
  onResetView,
  onToggleMeasureDistance,
  onToggleMeasureArea,
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

      {/* 右侧悬浮移动端 GIS 交互工具组 */}
      <div className="absolute right-3.5 bottom-20 z-20 flex flex-col gap-2">
        {/* 空间测距 */}
        <button
          onClick={onToggleMeasureDistance}
          className={`w-11 h-11 rounded-2xl border shadow-xl flex items-center justify-center transition ${
            drawingTool === 'measure-distance'
              ? 'bg-amber-500 border-amber-400 text-gray-950 ring-2 ring-amber-500/40'
              : 'bg-gray-900/90 border-gray-800 text-gray-300 active:bg-gray-800 backdrop-blur-md'
          }`}
          title="折线测距 (Distance)"
        >
          <Ruler className="w-5 h-5" />
        </button>

        {/* 空间测面 */}
        <button
          onClick={onToggleMeasureArea}
          className={`w-11 h-11 rounded-2xl border shadow-xl flex items-center justify-center transition ${
            drawingTool === 'measure-area'
              ? 'bg-emerald-500 border-emerald-400 text-gray-950 ring-2 ring-emerald-500/40'
              : 'bg-gray-900/90 border-gray-800 text-gray-300 active:bg-gray-800 backdrop-blur-md'
          }`}
          title="多边形测面 (Area)"
        >
          <Maximize2 className="w-5 h-5 text-emerald-400" />
        </button>

        {/* 复位到中心 */}
        <button
          onClick={onResetView}
          className="w-11 h-11 rounded-2xl bg-gray-900/90 border border-gray-800 text-gray-300 active:bg-gray-800 backdrop-blur-md shadow-xl flex items-center justify-center transition"
          title="复位中心视角 (Zoom to Extent)"
        >
          <Crosshair className="w-5 h-5 text-blue-400" />
        </button>

        {/* 缩放按钮 */}
        <div className="flex flex-col bg-gray-900/90 border border-gray-800 rounded-2xl backdrop-blur-md shadow-xl overflow-hidden">
          <button
            onClick={onZoomIn}
            className="w-11 h-11 flex items-center justify-center text-gray-200 active:bg-gray-800 border-b border-gray-800/80 transition"
            title="放大"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={onZoomOut}
            className="w-11 h-11 flex items-center justify-center text-gray-200 active:bg-gray-800 transition"
            title="缩小"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};
