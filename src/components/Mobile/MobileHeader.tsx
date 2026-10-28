import React from 'react';
import { User, PlotLayer } from '../../types';
import { ThemeMode } from '../../services/themeService';
import { Layers, ChevronDown, MoreHorizontal, Sun, Moon } from 'lucide-react';

interface MobileHeaderProps {
  currentUser: User | null;
  activeLayer: PlotLayer | undefined;
  onOpenLayers: () => void;
  onOpenMore: () => void;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentUser,
  activeLayer,
  onOpenLayers,
  onOpenMore,
  theme = 'dark',
  onToggleTheme,
}) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-3.5 pt-[max(env(safe-area-inset-top),12px)] select-none">
      <div className="flex items-center justify-between">
        {/* 左侧：当前工作图层灵动胶囊 (单行设计，告别拥挤与截断) */}
        <button
          onClick={onOpenLayers}
          className="pointer-events-auto flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg active:scale-95 transition-all text-slate-800 dark:text-gray-100 max-w-[60%]"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-2 ring-black/5 dark:ring-white/20"
            style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
          />
          <span className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate tracking-tight">
            {activeLayer?.name || '默认工作图层'}
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400 shrink-0 ml-0.5" />
        </button>

        {/* 右侧：主题切换与控制中心一体化胶囊 (高颜值一体化排布，彻底释放横向空间) */}
        <div className="pointer-events-auto flex items-center p-1 rounded-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-800/80 active:scale-90 transition text-slate-700 dark:text-amber-400"
              title={theme === 'dark' ? '切换为清新浅色模式' : '切换为极夜深色模式'}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5 text-indigo-600" />}
            </button>
          )}

          <span className="w-px h-3.5 bg-slate-200 dark:bg-gray-800 mx-0.5" />

          <button
            onClick={onOpenMore}
            className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800/80 active:scale-95 transition text-slate-800 dark:text-gray-200"
            title="控制中心与设置"
          >
            <span className="text-sm leading-none">{currentUser?.avatar || '👤'}</span>
            <span className="text-xs font-bold truncate max-w-[64px]">
              {currentUser?.displayName.split(' ')[0] || '李工'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
