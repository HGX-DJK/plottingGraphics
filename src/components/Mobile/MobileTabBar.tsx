import React from 'react';
import {
  Layers,
  PenTool,
  ListFilter,
  Sliders,
  MoreHorizontal,
} from 'lucide-react';

export type MobileTab = 'layers' | 'plot' | 'features' | 'properties' | 'more' | null;

interface MobileTabBarProps {
  activeTab: MobileTab;
  onSelectTab: (tab: MobileTab) => void;
  layersCount: number;
  featuresCount: number;
  hasSelectedFeature: boolean;
  isDrawing: boolean;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  activeTab,
  onSelectTab,
  layersCount,
  featuresCount,
  hasSelectedFeature,
  isDrawing,
}) => {
  return (
    <nav className="absolute bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-gray-800/80 safe-bottom select-none transition-colors duration-200">
      <div className="h-14 px-2 flex items-center justify-around">
        {/* 1. 图层管理 */}
        <button
          onClick={() => onSelectTab(activeTab === 'layers' ? null : 'layers')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            activeTab === 'layers' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-gray-400'
          }`}
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            <span className="absolute -top-1 -right-2 text-[9px] px-1 py-0 rounded-full bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-mono">
              {layersCount}
            </span>
          </div>
          <span className="text-[10px] mt-1">图层</span>
        </button>

        {/* 2. 标绘工具箱 (核心大按钮) */}
        <button
          onClick={() => onSelectTab(activeTab === 'plot' ? null : 'plot')}
          className="flex-1 flex flex-col items-center justify-center py-1 transition group"
        >
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
              isDrawing
                ? 'bg-amber-500 text-gray-950 ring-4 ring-amber-500/30 scale-105 animate-pulse'
                : activeTab === 'plot'
                ? 'bg-blue-600 text-white ring-4 ring-blue-500/30 scale-105'
                : 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-blue-500/25'
            }`}
          >
            <PenTool className="w-5 h-5" />
          </div>
          <span
            className={`text-[10px] mt-1 font-medium ${
              isDrawing
                ? 'text-amber-500 dark:text-amber-400 font-bold'
                : activeTab === 'plot'
                ? 'text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-gray-300'
            }`}
          >
            {isDrawing ? '标绘中' : '标绘'}
          </span>
        </button>

        {/* 3. 要素清单 */}
        <button
          onClick={() => onSelectTab(activeTab === 'features' ? null : 'features')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            activeTab === 'features' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-gray-400'
          }`}
        >
          <div className="relative">
            <ListFilter className="w-5 h-5" />
            <span className="absolute -top-1 -right-2 text-[9px] px-1 py-0 rounded-full bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-mono">
              {featuresCount}
            </span>
          </div>
          <span className="text-[10px] mt-1">要素</span>
        </button>

        {/* 4. 要素属性 (仅选中时显示或高亮) */}
        <button
          onClick={() => {
            if (hasSelectedFeature) {
              onSelectTab(activeTab === 'properties' ? null : 'properties');
            }
          }}
          disabled={!hasSelectedFeature}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition relative ${
            !hasSelectedFeature
              ? 'opacity-30 cursor-not-allowed text-slate-400 dark:text-gray-600'
              : activeTab === 'properties'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          <div className="relative">
            <Sliders className="w-5 h-5" />
            {hasSelectedFeature && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <span className="text-[10px] mt-1">属性</span>
        </button>

        {/* 5. 更多与设置 */}
        <button
          onClick={() => onSelectTab(activeTab === 'more' ? null : 'more')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition ${
            activeTab === 'more' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-500 dark:text-gray-400'
          }`}
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] mt-1">更多</span>
        </button>
      </div>
    </nav>
  );
};
