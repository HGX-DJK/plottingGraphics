import React from 'react';
import { User, PlotLayer, BasemapType } from '../../types';
import { Layers, Globe2, Shield, Compass } from 'lucide-react';

interface MobileHeaderProps {
  currentUser: User | null;
  activeLayer: PlotLayer | undefined;
  basemap: BasemapType;
  cursorCoords: [number, number];
  zoomLevel: number;
  onOpenLayers: () => void;
  onOpenMore: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentUser,
  activeLayer,
  basemap,
  cursorCoords,
  zoomLevel,
  onOpenLayers,
  onOpenMore,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 bg-gray-950/85 backdrop-blur-md border-b border-gray-800/80 safe-top select-none transition-all">
      <div className="h-12 px-3.5 flex items-center justify-between">
        {/* 左侧：当前工作图层快捷药丸按钮 */}
        <button
          onClick={onOpenLayers}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-gray-900 border border-gray-800 active:bg-gray-800 transition shadow-sm max-w-[150px]"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow"
            style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
          />
          <span className="text-xs font-semibold text-gray-200 truncate">
            {activeLayer?.name || '图层'}
          </span>
          <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        </button>

        {/* 中间：坐标与缩放状态 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wider">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>GeoPlot GIS 标绘</span>
          </div>
          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
            <span>Z{zoomLevel.toFixed(1)}</span>
            <span className="text-gray-600">•</span>
            <span>{cursorCoords[0].toFixed(3)}°, {cursorCoords[1].toFixed(3)}°</span>
          </div>
        </div>

        {/* 右侧：用户与更多 */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onOpenMore}
            className="flex items-center gap-1.5 p-1.5 rounded-full bg-gray-900 border border-gray-800 text-gray-300 active:bg-gray-800 transition"
          >
            <span className="text-sm leading-none">{currentUser?.avatar || '👤'}</span>
            <span className="text-[11px] font-medium text-gray-200 pr-1 hidden xs:inline">
              {currentUser?.displayName.split(' ')[0] || '指挥官'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
