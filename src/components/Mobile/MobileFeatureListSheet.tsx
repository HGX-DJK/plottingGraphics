import React, { useState } from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  ListFilter,
  Search,
  Crosshair,
  Trash2,
  Navigation,
  Radio,
  Milestone,
  Type,
  Activity,
  Hexagon,
  Sparkles,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileFeatureListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  features: PlotFeature[];
  layers: PlotLayer[];
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
  onDeleteFeature: (featureId: string) => void;
}

export const MobileFeatureListSheet: React.FC<MobileFeatureListSheetProps> = ({
  isOpen,
  onClose,
  features,
  layers,
  selectedFeatureId,
  onSelectFeature,
  onDeleteFeature,
}) => {
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');

  const getIcon = (type: string) => {
    if (type.includes('arrow')) return Navigation;
    if (type === 'gathering-place') return Sparkles;
    if (type === 'sector' || type.startsWith('post-')) return Radio;
    if (type === 'text') return Type;
    if (type === 'polyline' || type === 'freehand') return Activity;
    return Hexagon;
  };

  const filtered = features.filter((f) => {
    const matchSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.properties.notes && f.properties.notes.toLowerCase().includes(search.toLowerCase()));
    const matchLayer = layerFilter === 'all' || f.layerId === layerFilter;
    return matchSearch && matchLayer;
  });

  const handleCardClick = (id: string) => {
    onSelectFeature(id);
    onClose();
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="标绘要素清单"
      icon={<ListFilter className="w-4 h-4" />}
    >
      <div className="space-y-3 pb-4">
        {/* 搜索框 */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索要素名称 / 战术备注..."
            className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 图层标签横向滚动过滤器 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setLayerFilter('all')}
            className={`px-3 py-1 rounded-full text-xs shrink-0 transition ${
              layerFilter === 'all'
                ? 'bg-blue-600 text-white font-medium shadow'
                : 'bg-gray-950 text-gray-400 border border-gray-800'
            }`}
          >
            全部 ({features.length})
          </button>
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayerFilter(l.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shrink-0 transition ${
                layerFilter === l.id
                  ? 'bg-blue-600 text-white font-medium shadow'
                  : 'bg-gray-950 text-gray-400 border border-gray-800'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: l.color }}
              />
              <span className="truncate max-w-[100px]">{l.name}</span>
            </button>
          ))}
        </div>

        {/* 要素卡片列表 */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-500 text-xs">
              <Crosshair className="w-8 h-8 opacity-30 mb-2" />
              <span>暂无符合条件的要素</span>
            </div>
          ) : (
            filtered.map((feat) => {
              const layer = layers.find((l) => l.id === feat.layerId);
              const Icon = getIcon(feat.type);
              const isSelected = feat.id === selectedFeatureId;

              return (
                <div
                  key={feat.id}
                  onClick={() => handleCardClick(feat.id)}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/50 shadow-md'
                      : 'border-gray-800 bg-gray-950/70 active:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${layer?.color || '#3b82f6'}20`,
                        borderColor: `${layer?.color || '#3b82f6'}40`,
                        color: layer?.color || '#3b82f6',
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-gray-100 truncate">
                        {feat.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: layer?.color || '#666' }}
                        />
                        <span className="text-[10px] text-gray-400 truncate">
                          {layer?.name || '未知图层'}
                        </span>
                        {feat.properties.notes && (
                          <span className="text-[10px] text-gray-500 truncate max-w-[120px]">
                            • {feat.properties.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`确定删除要素 "${feat.name}" 吗？`)) {
                        onDeleteFeature(feat.id);
                      }
                    }}
                    className="p-2 text-gray-500 hover:text-red-400 active:bg-red-950/30 rounded-lg transition"
                    title="删除要素"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </MobileBottomSheet>
  );
};
