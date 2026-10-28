import React from 'react';
import { PlotFeatureType } from '../../types';
import {
  Plus,
  Minus,
  Crosshair,
  Ruler,
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
  onToggleMeasure: () => void;
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
  onToggleMeasure,
}) => {
  const getToolDisplayName = (tool: string) => {
    const names: Record<string, string> = {
      'straight-arrow': '进攻直箭头',
      'attack-arrow': '突击进攻箭头',
      'pincer-arrow': '钳击双箭头',
      'gathering-place': '战役集结地域',
      'sector': '预警扇形',
      'polyline': '机动路线 (折线)',
      'polygon': '控制地域 (多边形)',
      'rectangle': '搜索网格 (矩形)',
      'circle': '警戒半径 (圆形)',
      'marker': '战术标记点',
      'text': '文字注记',
      'freehand': '态势手绘线',
      'measure-distance': '球面测距',
    };
    if (tool.startsWith('post-')) return '战术点标号';
    return names[tool] || tool;
  };

  const getRequiredPointsText = (tool: string, count: number) => {
    if (tool === 'straight-arrow' || tool === 'circle' || tool === 'sector' || tool === 'rectangle') {
      return `已点标 ${count}/2 点`;
    }
    if (tool === 'attack-arrow' || tool === 'pincer-arrow' || tool === 'gathering-place') {
      return `已点标 ${count}/3 点`;
    }
    if (tool === 'polyline' || tool === 'polygon' || tool === 'freehand') {
      return `已添加 ${count} 个顶点 (双击或点完成)`;
    }
    return '轻触地图落点';
  };

  const canFinish =
    drawingTool === 'polyline' || drawingTool === 'freehand'
      ? drawingPointsCount >= 2
      : drawingTool === 'polygon'
      ? drawingPointsCount >= 3
      : false;

  return (
    <>
      {/* 顶部标绘状态指示条 (仅在标绘模式时显示) */}
      {drawingTool && (
        <div className="absolute top-14 left-3 right-3 z-30 flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-gray-900/95 backdrop-blur-md border border-amber-500/50 shadow-2xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-300 truncate">
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
              className="p-1 rounded-xl bg-gray-800 text-gray-400 hover:text-white transition"
              title="取消标绘"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 右侧悬浮移动端地图控制按钮组 */}
      <div className="absolute right-3.5 bottom-20 z-20 flex flex-col gap-2">
        {/* 测距快捷开关 */}
        <button
          onClick={onToggleMeasure}
          className={`w-11 h-11 rounded-2xl border shadow-xl flex items-center justify-center transition ${
            drawingTool === 'measure-distance'
              ? 'bg-amber-500 border-amber-400 text-gray-950 ring-2 ring-amber-500/40'
              : 'bg-gray-900/90 border-gray-800 text-gray-300 active:bg-gray-800 backdrop-blur-md'
          }`}
          title="球面测距"
        >
          <Ruler className="w-5 h-5" />
        </button>

        {/* 复位到中心 */}
        <button
          onClick={onResetView}
          className="w-11 h-11 rounded-2xl bg-gray-900/90 border border-gray-800 text-gray-300 active:bg-gray-800 backdrop-blur-md shadow-xl flex items-center justify-center transition"
          title="复位中心视角"
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
