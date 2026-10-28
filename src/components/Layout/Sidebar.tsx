import React, { useState } from 'react';
import {
  Layers,
  PenTool,
  ListOrdered,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { LayerManager } from '../Layers/LayerManager';
import { FeatureToolbox } from '../Features/FeatureToolbox';
import { FeatureList } from '../Features/FeatureList';
import { PlotLayer, PlotFeature, PlotFeatureType } from '../../types';

export type SidebarTab = 'layers' | 'toolbox' | 'features';

interface SidebarProps {
  layers: PlotLayer[];
  features: PlotFeature[];
  activeLayerId: string;
  selectedFeatureId: string | null;
  drawingTool: PlotFeatureType | null;
  onSelectActiveLayer: (layerId: string) => void;
  onToggleLayerVisibility: (layerId: string) => void;
  onToggleLayerLock: (layerId: string) => void;
  onChangeLayerOpacity: (layerId: string, opacity: number) => void;
  onDeleteLayer: (layerId: string) => void;
  onOpenNewLayerModal: () => void;
  onSelectDrawingTool: (tool: PlotFeatureType | null) => void;
  onSelectFeature: (featureId: string | null) => void;
  onDeleteFeature: (featureId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  layers,
  features,
  activeLayerId,
  selectedFeatureId,
  drawingTool,
  onSelectActiveLayer,
  onToggleLayerVisibility,
  onToggleLayerLock,
  onChangeLayerOpacity,
  onDeleteLayer,
  onOpenNewLayerModal,
  onSelectDrawingTool,
  onSelectFeature,
  onDeleteFeature,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('layers');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const tabs = [
    {
      id: 'layers' as SidebarTab,
      label: '图层管控',
      icon: Layers,
      count: layers.length,
    },
    {
      id: 'toolbox' as SidebarTab,
      label: '标绘工具',
      icon: PenTool,
    },
    {
      id: 'features' as SidebarTab,
      label: '要素清单',
      icon: ListOrdered,
      count: features.length,
    },
  ];

  return (
    <div
      className={`relative h-full flex flex-col z-20 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-14' : 'w-84 sm:w-96'
      }`}
    >
      {/* 侧栏主体 */}
      <div className="flex-1 flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden shadow-2xl">
        {/* 顶部标签切换栏 */}
        <div className="flex border-b border-gray-800 bg-gray-950/80 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isCollapsed) setIsCollapsed(false);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition ${
                  isActive
                    ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                } ${isCollapsed ? 'px-2' : 'px-3'}`}
                title={tab.label}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!isCollapsed && <span>{tab.label}</span>}
                {!isCollapsed && tab.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isActive
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 标签页内容区域 */}
        {!isCollapsed && (
          <div className="flex-1 overflow-hidden">
            {activeTab === 'layers' && (
              <LayerManager
                layers={layers}
                features={features}
                activeLayerId={activeLayerId}
                onSelectActiveLayer={onSelectActiveLayer}
                onToggleVisibility={onToggleLayerVisibility}
                onToggleLock={onToggleLayerLock}
                onChangeOpacity={onChangeLayerOpacity}
                onDeleteLayer={onDeleteLayer}
                onOpenNewLayerModal={onOpenNewLayerModal}
              />
            )}

            {activeTab === 'toolbox' && (
              <FeatureToolbox
                currentDrawingTool={drawingTool}
                onSelectDrawingTool={onSelectDrawingTool}
                activeLayerName={activeLayer?.name || '默认工作图层'}
                activeLayerColor={activeLayer?.color || '#3b82f6'}
              />
            )}

            {activeTab === 'features' && (
              <FeatureList
                features={features}
                layers={layers}
                selectedFeatureId={selectedFeatureId}
                onSelectFeature={(id) => onSelectFeature(id)}
                onDeleteFeature={onDeleteFeature}
              />
            )}
          </div>
        )}
      </div>

      {/* 侧栏收起/展开浮动按钮 */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-20 z-30 w-6 h-12 bg-gray-800 hover:bg-blue-600 text-gray-300 hover:text-white border border-gray-700 rounded-r-lg shadow-xl flex items-center justify-center transition"
        title={isCollapsed ? '展开面板' : '折叠面板'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
};
