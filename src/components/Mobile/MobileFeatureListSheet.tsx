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
  FolderTree,
  LayoutList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { formatArea, formatDistance } from '../../utils/geoUtils';

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
  onSelectActiveLayer?: (layerId: string) => void;
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
  onSelectActiveLayer,
}) => {
  const [search, setSearch] = useState('');
  const [layerFilter, setLayerFilter] = useState('all');
  // 默认开启 "按图层级联分组"，让要素与图层的隶属关系一目了然
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (layerId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  const getIcon = (type: string) => {
    if (type.includes('arrow')) return Navigation;
    if (type === 'gathering-place') return Sparkles;
    if (type === 'sector' || type.startsWith('post-')) return Radio;
    if (type === 'text') return Type;
    if (type === 'polyline' || type === 'freehand') return Activity;
    if (type === 'marker') return Milestone;
    return Hexagon;
  };

  const getFeatureMetric = (feat: PlotFeature) => {
    if (feat.properties.calculatedArea) {
      return `面积: ${formatArea(feat.properties.calculatedArea)}`;
    }
    if (feat.properties.calculatedLength) {
      return `长度: ${formatDistance(feat.properties.calculatedLength)}`;
    }
    if (feat.properties.radius) {
      return `半径: ${formatDistance(feat.properties.radius)}`;
    }
    if (feat.coordinates && feat.coordinates[0]) {
      return `${feat.coordinates[0][0].toFixed(4)}, ${feat.coordinates[0][1].toFixed(4)}`;
    }
    return null;
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

  // 渲染单个要素卡片
  const renderFeatureCard = (feat: PlotFeature, parentLayer?: PlotLayer) => {
    const layer = parentLayer || layers.find((l) => l.id === feat.layerId);
    const Icon = getIcon(feat.type);
    const isSelected = feat.id === selectedFeatureId;
    const metric = getFeatureMetric(feat);

    return (
      <div
        key={feat.id}
        onClick={() => handleCardClick(feat.id)}
        className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
          isSelected
            ? 'border-blue-500 bg-blue-950/40 ring-1 ring-blue-500/50 shadow-md'
            : 'border-gray-800 bg-gray-950/70 hover:bg-gray-900 active:bg-gray-850'
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
              {metric && (
                <span className="text-[10px] text-blue-400 font-mono truncate">
                  • {metric}
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
        {/* 顶部统计与视图切换 */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/40">
          <div className="flex items-center gap-2 pl-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-gray-200">
              共收录 {features.length} 个标绘要素
            </span>
          </div>

          {/* 切换展示方式：按图层分组 vs 平铺 */}
          <div className="flex items-center bg-gray-950/80 p-0.5 rounded-xl border border-gray-800 text-[11px]">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'grouped'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="按图层树级联归属分组展示"
            >
              <FolderTree className="w-3 h-3" />
              <span>按图层分组</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                viewMode === 'flat'
                  ? 'bg-blue-600 text-white font-bold shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              title="平铺列表展示"
            >
              <LayoutList className="w-3 h-3" />
              <span>平铺</span>
            </button>
          </div>
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
              <span className="truncate max-w-[110px]">{l.name}</span>
            </button>
          ))}
        </div>

        {/* 要素内容区域 */}
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
        ) : viewMode === 'grouped' ? (
          /* 🌲 按图层级联分组展示 (严格将要素展示在所属图层下方) */
          <div className="space-y-3">
            {layers
              .filter((layer) => layerFilter === 'all' || layerFilter === layer.id)
              .map((layer) => {
                const groupFeatures = filtered.filter((f) => f.layerId === layer.id);
                const isCollapsed = collapsedGroups[layer.id];

                return (
                  <div
                    key={layer.id}
                    className="rounded-2xl border border-gray-800/90 bg-gray-950/60 overflow-hidden"
                  >
                    {/* 分组表头 (所属图层标识) */}
                    <div
                      onClick={() => toggleGroup(layer.id)}
                      className="p-3 bg-gray-900/60 flex items-center justify-between cursor-pointer hover:bg-gray-900 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="text-gray-400">
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-blue-400" />
                          )}
                        </span>
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="text-xs font-bold text-gray-200 truncate">
                          {layer.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono font-medium shrink-0">
                          {groupFeatures.length} 个要素
                        </span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectActiveLayer?.(layer.id);
                          onClose();
                          onOpenPlotting?.();
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-medium px-2 py-1 rounded-lg hover:bg-blue-500/10 shrink-0 transition"
                        title="切换至此图层并开始标绘"
                      >
                        + 在此图层新建
                      </button>
                    </div>

                    {/* 该图层所属的要素卡片列表 */}
                    {!isCollapsed && (
                      <div className="p-2 space-y-2">
                        {groupFeatures.length === 0 ? (
                          <div className="py-3 text-center text-[11px] text-gray-500">
                            此图层暂无标绘要素
                          </div>
                        ) : (
                          groupFeatures.map((feat) => renderFeatureCard(feat, layer))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        ) : (
          /* 平铺列表展示 */
          <div className="space-y-2">
            {filtered.map((feat) => renderFeatureCard(feat))}
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};
