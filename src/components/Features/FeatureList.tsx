import React, { useState } from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  Search,
  Crosshair,
  Trash2,
  Filter,
  Navigation,
  Compass,
  Radio,
  Milestone,
  Type,
  Activity,
  Hexagon,
  Sparkles,
} from 'lucide-react';

interface FeatureListProps {
  features: PlotFeature[];
  layers: PlotLayer[];
  selectedFeatureId: string | null;
  onSelectFeature: (featureId: string) => void;
  onDeleteFeature: (featureId: string) => void;
}

export const FeatureList: React.FC<FeatureListProps> = ({
  features,
  layers,
  selectedFeatureId,
  onSelectFeature,
  onDeleteFeature,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLayerFilter, setSelectedLayerFilter] = useState<string>('all');

  const getFeatureIcon = (type: string) => {
    if (type.includes('arrow')) return Navigation;
    if (type === 'gathering-place') return Sparkles;
    if (type === 'sector') return Radio;
    if (type.startsWith('post-')) return Radio;
    if (type === 'text') return Type;
    if (type === 'polyline' || type === 'freehand') return Activity;
    if (type === 'polygon' || type === 'rectangle' || type === 'circle') return Hexagon;
    return Milestone;
  };

  const filteredFeatures = features.filter((feat) => {
    const matchesSearch =
      feat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (feat.properties.notes &&
        feat.properties.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLayer =
      selectedLayerFilter === 'all' || feat.layerId === selectedLayerFilter;

    return matchesSearch && matchesLayer;
  });

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 text-gray-200 select-none">
      {/* 搜索与过滤栏 */}
      <div className="p-3 border-b border-gray-800 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索要素名称 / 战术备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <select
            value={selectedLayerFilter}
            onChange={(e) => setSelectedLayerFilter(e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-800 rounded-lg text-xs text-gray-300 py-1 px-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">所有图层 ({features.length})</option>
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 要素列表 */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filteredFeatures.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-gray-500 text-xs">
            <Crosshair className="w-8 h-8 mb-2 opacity-30" />
            <span>暂无符合条件的标绘要素</span>
          </div>
        ) : (
          filteredFeatures.map((feat) => {
            const isSelected = feat.id === selectedFeatureId;
            const layer = layers.find((l) => l.id === feat.layerId);
            const Icon = getFeatureIcon(feat.type);

            return (
              <div
                key={feat.id}
                onClick={() => onSelectFeature(feat.id)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-950/40 shadow-md ring-1 ring-blue-500/50'
                    : 'border-gray-800 bg-gray-950/50 hover:border-gray-700 hover:bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="p-1.5 rounded-lg shrink-0 border"
                      style={{
                        backgroundColor: `${layer?.color || '#3b82f6'}20`,
                        borderColor: `${layer?.color || '#3b82f6'}40`,
                        color: layer?.color || '#3b82f6',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-gray-100 truncate">
                        {feat.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: layer?.color || '#666' }}
                        />
                        <span className="text-[11px] text-gray-400 truncate">
                          {layer?.name || '未知图层'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`确定删除要素 "${feat.name}" 吗？`)) {
                          onDeleteFeature(feat.id);
                        }
                      }}
                      className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded transition"
                      title="删除要素"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {feat.properties.notes && (
                  <div className="mt-1.5 text-[11px] text-gray-400 bg-gray-900/60 p-1.5 rounded border border-gray-800/80 line-clamp-1">
                    {feat.properties.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2.5 bg-gray-950 border-t border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
        <span>当前共 {features.length} 个标绘要素</span>
        <span>显示 {filteredFeatures.length} 个</span>
      </div>
    </div>
  );
};
