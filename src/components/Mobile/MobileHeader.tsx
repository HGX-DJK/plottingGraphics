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
        {/* 左侧：当前工作图层灵动胶囊 */}
        <button
          onClick={onOpenLayers}
          className="pointer-events-auto flex items-center gap-2 pl-3 pr-2.5 py-1.5 rounded-full bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl active:scale-95 transition-all text-slate-800 dark:text-gray-100"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-2 ring-black/5 dark:ring-white/20"
            style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
          />
          <div className="flex flex-col text-left max-w-[160px] sm:max-w-[175px]">
            <span className="text-[9px] text-slate-400 dark:text-gray-400 font-medium tracking-wide uppercase leading-none">
              当前图层
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5 leading-tight">
              {activeLayer?.name || '默认工作图层'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400 shrink-0" />
        </button>

        {/* 右侧：主题切换与控制中心胶囊 */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-lg active:scale-90 transition-all text-slate-700 dark:text-amber-400 hover:scale-105"
              title={theme === 'dark' ? '切换为清新浅色模式' : '切换为极夜深色模式'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          )}

          <button
            onClick={onOpenMore}
            className="flex items-center gap-1.5 pl-2.5 pr-3 py-1.5 rounded-full bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xl active:scale-95 transition-all text-slate-800 dark:text-gray-200"
          >
            <span className="text-sm leading-none">{currentUser?.avatar || '👤'}</span>
            <span className="text-xs font-bold">
              {currentUser?.displayName.split(' ')[0] || '李工'}
            </span>
            <MoreHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400 shrink-0 ml-0.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
