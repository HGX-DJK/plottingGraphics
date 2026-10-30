import React from 'react';
import { User, PlotLayer } from '../../types';
import { ThemeMode } from '../../services/themeService';
import { ChevronDown, Sun, Moon } from 'lucide-react';

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
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-3 pt-[max(env(safe-area-inset-top),12px)] select-none">
      {/* 顶栏合并为单一胶囊：左区=当前工作图层，右区=主题切换 + 当前身份
          统一 44px 高度与内边距，避免左右两块高低不齐；图层名占据弹性空间，
          既不会过早截断，也不会在中间留下空洞。 */}
      <div className="pointer-events-auto flex items-center gap-1 h-11 pl-1 pr-1 rounded-full bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-900/5 dark:shadow-black/30">
        {/* 左区：当前工作图层切换 */}
        <button
          onClick={onOpenLayers}
          aria-label={`当前工作图层 ${activeLayer?.name || '默认工作图层'}，点击打开图层管控`}
          className="flex items-center gap-2 min-w-0 flex-1 h-9 pl-2 pr-1.5 rounded-full text-left active:bg-slate-100/80 dark:active:bg-white/10 transition"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ring-2 ring-black/5 dark:ring-white/20"
            style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
          />
          <span className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate tracking-tight">
            {activeLayer?.name || '默认工作图层'}
          </span>
          <span className="w-5 h-5 shrink-0 rounded-full grid place-items-center bg-slate-100/90 dark:bg-white/10">
            <ChevronDown className="w-3 h-3 text-slate-500 dark:text-gray-400" />
          </span>
        </button>

        {/* 右区：主题切换 + 当前身份 */}
        <div className="flex items-center gap-0.5 shrink-0">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              aria-label={theme === 'dark' ? '切换为清新浅色模式' : '切换为极夜深色模式'}
              className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 dark:hover:bg-gray-800/80 active:scale-90 transition text-slate-600 dark:text-amber-400"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
          )}

          <span className="w-px h-4 bg-slate-200 dark:bg-gray-800 mx-1" />

          <button
            onClick={onOpenMore}
            aria-label="打开我的面板"
            className="flex items-center gap-1.5 h-9 pl-1 pr-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800/80 active:scale-95 transition"
          >
            {/* 头像徽章：用中性圆形托底，避免彩色 emoji 散落在界面中显得突兀 */}
            <span className="w-6 h-6 shrink-0 rounded-full grid place-items-center text-[12px] leading-none bg-slate-100 dark:bg-white/10 ring-1 ring-slate-200/80 dark:ring-white/10">
              {currentUser?.avatar || '👤'}
            </span>
            <span className="text-xs font-bold text-slate-800 dark:text-gray-100 truncate max-w-[72px]">
              {currentUser?.displayName.split(' ')[0] || '李工'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
