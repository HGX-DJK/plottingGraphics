import React from 'react';
import { PlotFeatureType } from '../../types';
import { Navigation, Compass, Layers, ShieldCheck } from 'lucide-react';

interface StatusBarProps {
  cursorCoords: [number, number];
  zoomLevel: number;
  activeLayerName: string;
  totalFeatures: number;
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  cursorCoords,
  zoomLevel,
  activeLayerName,
  totalFeatures,
  drawingTool,
}) => {
  return (
    <footer className="h-7 bg-gray-950 border-t border-gray-800 px-4 flex items-center justify-between text-[11px] text-gray-400 select-none z-30">
      {/* 坐标与缩放 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 font-mono">
          <Navigation className="w-3 h-3 text-blue-400 rotate-45" />
          <span>经度: {cursorCoords[0].toFixed(5)}°</span>
          <span className="text-gray-600">|</span>
          <span>纬度: {cursorCoords[1].toFixed(5)}°</span>
        </div>

        <div className="flex items-center gap-1 text-gray-400">
          <Compass className="w-3 h-3 text-cyan-400" />
          <span>缩放级别: <strong>Z{zoomLevel.toFixed(1)}</strong></span>
        </div>
      </div>

      {/* 状态与统计 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-300">
          <Layers className="w-3 h-3 text-blue-400" />
          <span>当前图层: <strong className="text-white">{activeLayerName}</strong></span>
          <span className="text-gray-600">|</span>
          <span>总要素数: <strong className="text-blue-400 font-mono">{totalFeatures}</strong></span>
        </div>

        <div className="flex items-center gap-1.5">
          {drawingTool ? (
            <span className="flex items-center gap-1 text-amber-400 font-medium animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              标绘交互中 ({drawingTool})
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              态势监控就绪
            </span>
          )}
        </div>
      </div>
    </footer>
  );
};
