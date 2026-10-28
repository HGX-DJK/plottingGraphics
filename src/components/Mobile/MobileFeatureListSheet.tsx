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
  Plus,
  PenTool,
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
  onOpenPlotting?: () => void;
  onOpenClearFeatures?: () => void;
}

export const MobileFeatureListSheet: React.FC<MobileFeatureListSheetProps> = ({
  isOpen,
  onClose,
  features,
  layers,
  selectedFeatureId,
  onSelectFeature,
  onDeleteFeature,
  onOpenPlotting,
  onOpenClearFeatures,
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
      headerAction={
        <div className="flex items-center gap-1.5">
          {onOpenClearFeatures && features.length > 0 && (
            <button
              onClick={() => {
                onClose();
                onOpenClearFeatures();
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 active:bg-red-900/50 text-[11px] font-bold transition"
              title="清空地图要素"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span>清空</span>
            </button>
          )}
          <button
            onClick={() => {
              onClose();
              onOpenPlotting?.();
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-blue-600 active:bg-blue-500 text-white text-[11px] font-bold shadow-md shadow-blue-600/30 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增</span>
          </button>
        </div>
      }
    >
      <div className="space-y-3 pb-4">
        {/* 顶部统计与新增提示卡片 */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/40">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-200">
              当前收录 {features.length} 个标绘要素
            </span>
          </div>
          <button
            onClick={() => {
              onClose();
              onOpenPlotting?.();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 active:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>+ 绘制新要素</span>
          </button>
        </div>

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
            <div className="py-8 text-center bg-gray-950/40 rounded-2xl border border-dashed border-gray-800 p-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-2">
                <PenTool className="w-6 h-6" />
              </div>
              <div className="text-gray-200 font-medium text-xs">暂无匹配的标绘要素</div>
              <div className="text-[11px] text-gray-400 mt-1 mb-3.5">
                随时可以在地图上落点绘制点、线、面及空间注记
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenPlotting?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 active:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition"
              >
                <Plus className="w-4 h-4" />
                <span>立即标绘新要素</span>
              </button>
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
