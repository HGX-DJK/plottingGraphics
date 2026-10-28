import React from 'react';
import { User, PlotLayer } from '../../types';
import { Layers, ChevronDown, MoreHorizontal } from 'lucide-react';

interface MobileHeaderProps {
  currentUser: User | null;
  activeLayer: PlotLayer | undefined;
  onOpenLayers: () => void;
  onOpenMore: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentUser,
  activeLayer,
  onOpenLayers,
  onOpenMore,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-3.5 pt-[max(env(safe-area-inset-top),12px)] select-none">
      <div className="flex items-center justify-between">
        {/* 左侧：当前工作图层灵动胶囊 */}
        <button
          onClick={onOpenLayers}
          className="pointer-events-auto flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full bg-gray-950/85 backdrop-blur-xl border border-white/10 shadow-2xl active:scale-95 transition-transform"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-2 ring-white/20"
            style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
          />
          <div className="flex flex-col text-left max-w-[130px]">
            <span className="text-[9px] text-gray-400 font-medium tracking-wide uppercase leading-none">
              当前图层
            </span>
            <span className="text-xs font-bold text-gray-100 truncate mt-0.5 leading-tight">
              {activeLayer?.name || '默认工作图层'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>

        {/* 右侧：用户与控制中心胶囊 */}
        <button
          onClick={onOpenMore}
          className="pointer-events-auto flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-gray-950/85 backdrop-blur-xl border border-white/10 shadow-2xl active:scale-95 transition-transform"
        >
          <span className="text-sm leading-none">{currentUser?.avatar || '👤'}</span>
          <span className="text-xs font-bold text-gray-200">
            {currentUser?.displayName.split(' ')[0] || '李工'}
          </span>
          <MoreHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-0.5" />
        </button>
      </div>
    </header>
  );
};
