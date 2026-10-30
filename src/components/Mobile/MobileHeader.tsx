import React from 'react';
import { Search } from 'lucide-react';

interface MobileHeaderProps {
  onOpenSearch: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenSearch }) => {
  return (
    <header className="absolute top-0 left-0 right-0 z-30 pointer-events-none px-3 pt-[max(env(safe-area-inset-top),12px)] select-none">
      {/* 沉浸式全局搜索胶囊：全宽、高识别度，点击任意区域立即唤起高德 POI 检索 */}
      <div
        onClick={onOpenSearch}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            onOpenSearch();
          }
        }}
        aria-label="搜索全国地点、地名、道路、水库与工区"
        className="pointer-events-auto flex items-center gap-3 h-11 px-4 rounded-full bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-900/5 dark:shadow-black/30 cursor-pointer active:scale-[0.99] transition group"
      >
        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
        <span className="flex-1 text-xs text-slate-400 dark:text-gray-400 font-medium truncate">
          搜索全国地名、道路、水库、工区...
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0 border border-blue-200/60 dark:border-blue-800/40">
          高德 POI
        </span>
      </div>
    </header>
  );
};
