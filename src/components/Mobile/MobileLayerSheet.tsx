import React, { useState } from 'react';
import { PlotLayer, PlotFeature } from '../../types';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Sliders,
  Check,
  PenTool,
  ChevronDown,
  ChevronRight,
  Crosshair,
  Hexagon,
  Activity,
  Milestone,
  Type,
  Navigation,
  Sparkles,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { formatArea, formatDistance } from '../../utils/geoUtils';

interface MobileLayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  layers: PlotLayer[];
  features: PlotFeature[];
  activeLayerId: string;
  onSelectActiveLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onChangeOpacity: (layerId: string, opacity: number) => void;
  onDeleteLayer: (layerId: string) => void;
  onOpenNewLayerModal: () => void;
  onStartPlotting?: () => void;
  onSelectFeature?: (featureId: string) => void;
  onDeleteFeature?: (featureId: string) => void;
  onLocateFeature?: (featureId: string) => void;
}

export const MobileLayerSheet: React.FC<MobileLayerSheetProps> = ({
  isOpen,
  onClose,
  layers,
  features,
  activeLayerId,
  onSelectActiveLayer,
  onToggleVisibility,
  onToggleLock,
  onChangeOpacity,
  onDeleteLayer,
  onOpenNewLayerModal,
  onStartPlotting,
  onSelectFeature,
  onDeleteFeature,
  onLocateFeature,
}) => {
  // 记录每个图层树分支的折叠/展开状态（默认当前激活图层展开）
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => ({
    [activeLayerId]: true,
  }));

  // 记录哪个图层的透明度调节面板处于打开状态
  const [sliderLayerId, setSliderLayerId] = useState<string | null>(null);

  const toggleExpand = (layerId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [layerId]: prev[layerId] === undefined ? false : !prev[layerId],
    }));
  };

  const getFeatureIcon = (type: string) => {
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
    return '空间矢量要素';
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="GIS 图层与要素管控中心"
      icon={<Layers className="w-4 h-4" />}
      headerAction={
        <button
          onClick={() => {
            onClose();
            onOpenNewLayerModal();
          }}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full text-xs font-semibold shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建图层</span>
        </button>
      }
    >
      <div className="space-y-3 pb-4">
        {/* 顶部专业提示 */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-gray-900/60 border border-gray-800/80 text-[11px] text-gray-400">
          <span>展开图层可直接查看、定位与管理其隶属的要素</span>
          <span className="text-blue-400 font-mono">共 {layers.length} 图层 / {features.length} 要素</span>
        </div>

        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const layerFeatures = features.filter((f) => f.layerId === layer.id);
          const isExpanded = expandedMap[layer.id] ?? (isActive || layerFeatures.length > 0);
          const isSliderOpen = sliderLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={`rounded-2xl border transition-all ${
                isActive
                  ? 'border-blue-500/80 bg-blue-950/20 shadow-lg ring-1 ring-blue-500/30'
                  : 'border-gray-800 bg-gray-950/70'
              }`}
            >
              <div className="p-3">
                {/* 1. 图层卡片主表头 */}
                <div className="flex items-center justify-between gap-2">
                  {/* 左侧：折叠箭头 + 颜色点 + 名称 + 要素计数 */}
                  <div
                    onClick={() => {
                      onSelectActiveLayer(layer.id);
                      toggleExpand(layer.id);
                    }}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(layer.id);
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-blue-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow ring-2 ring-white/10"
                      style={{ backgroundColor: layer.color }}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-100 truncate">
                          {layer.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500 text-white font-medium shrink-0">
                            当前工作层
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>隶属要素: <strong className="text-gray-200 font-mono">{layerFeatures.length}</strong> 个</span>
                        {!layer.visible && <span className="text-amber-400">(已隐藏)</span>}
                        {layer.locked && <span className="text-red-400">(已锁定)</span>}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：显隐、锁定、设置 */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onToggleVisibility(layer.id)}
                      className={`p-2 rounded-xl transition ${
                        layer.visible
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-gray-600 bg-gray-900'
                      }`}
                      title={layer.visible ? '点击隐藏图层' : '点击显示图层'}
                    >
                      {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => onToggleLock(layer.id)}
                      className={`p-2 rounded-xl transition ${
                        layer.locked
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-gray-500 bg-gray-900'
                      }`}
                      title={layer.locked ? '图层已锁定 (点击解锁)' : '图层可编辑 (点击锁定)'}
                    >
                      {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setSliderLayerId(isSliderOpen ? null : layer.id)}
                      className={`p-2 rounded-xl transition ${
                        isSliderOpen
                          ? 'text-blue-400 bg-blue-500/20'
                          : 'text-gray-400 hover:text-white bg-gray-900'
                      }`}
                      title="展开图层设置与透明度"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. 展开的图层高级设置 (透明度滑块与删除图层) */}
                {isSliderOpen && (
                  <div className="mt-3 pt-3 border-t border-gray-800/80 space-y-3 bg-gray-900/40 p-2.5 rounded-xl">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                        <span className="flex items-center gap-1.5">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                          <span>图层透明度调节</span>
                        </span>
                        <span className="font-mono text-blue-400 font-bold">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={layer.opacity}
                        onChange={(e) => onChangeOpacity(layer.id, parseFloat(e.target.value))}
                        className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-500">
                        创建时间: {new Date(layer.createdAt).toLocaleDateString()}
                      </span>
                      {layers.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`确定删除图层 "${layer.name}" 及其包含的全部 ${layerFeatures.length} 个要素吗？`)) {
                              onDeleteLayer(layer.id);
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2.5 py-1 rounded-xl bg-red-950/40 border border-red-900/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除图层</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. 核心亮点：图层包含要素树形清单 (Features Hierarchical Tree Under Layer) */}
                {isExpanded && (
                  <div className="mt-3 pt-2.5 border-t border-gray-800/80">
                    <div
                      className="pl-3 ml-2 border-l-2 space-y-2"
                      style={{ borderColor: `${layer.color}66` }}
                    >
                      {/* 图层分支表头说明 */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pb-0.5">
                        <span className="font-medium text-gray-300">
                          该图层下的要素 ({layerFeatures.length})
                        </span>
                        {!isActive && (
                          <button
                            onClick={() => onSelectActiveLayer(layer.id)}
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            设为当前绘制层
                          </button>
                        )}
                      </div>

                      {/* 要素列表为空时的状态 */}
                      {layerFeatures.length === 0 ? (
                        <div className="p-3 rounded-xl bg-gray-900/40 border border-dashed border-gray-800 text-center">
                          <div className="text-xs text-gray-400">此图层下暂无要素</div>
                          <div className="text-[10px] text-gray-500 mt-0.5 mb-2.5">
                            点击下方按钮立即在此图层创建新标绘
                          </div>
                          <button
                            onClick={() => {
                              onSelectActiveLayer(layer.id);
                              onClose();
                              onStartPlotting?.();
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 text-xs font-bold transition"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                            <span>在此图层新建标绘</span>
                          </button>
                        </div>
                      ) : (
                        /* 要素列表不为空时逐项列出 */
                        <div className="space-y-1.5">
                          {layerFeatures.map((feat) => {
                            const Icon = getFeatureIcon(feat.type);
                            return (
                              <div
                                key={feat.id}
                                className="group flex items-center justify-between p-2 rounded-xl bg-gray-900/80 hover:bg-gray-900 border border-gray-800/90 transition-all"
                              >
                                {/* 点击查看属性 */}
                                <div
                                  onClick={() => {
                                    onSelectFeature?.(feat.id);
                                    onClose();
                                  }}
                                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                                  title="点击查看/编辑要素属性"
                                >
                                  <div
                                    className="p-1.5 rounded-lg shrink-0"
                                    style={{
                                      backgroundColor: `${layer.color}20`,
                                      color: layer.color,
                                    }}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-semibold text-gray-200 truncate">
                                      {feat.name}
                                    </div>
                                    <div className="text-[10px] text-gray-400 truncate mt-0.5">
                                      {getFeatureMetric(feat)}
                                    </div>
                                  </div>
                                </div>

                                {/* 右侧操作按钮：地图定位与删除 */}
                                <div className="flex items-center gap-1 ml-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      if (onLocateFeature) {
                                        onLocateFeature(feat.id);
                                      } else if (onSelectFeature) {
                                        onSelectFeature(feat.id);
                                      }
                                      onClose();
                                    }}
                                    className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 text-blue-400 text-xs transition"
                                    title="在地图中居中定位该要素"
                                  >
                                    <Crosshair className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => {
                                      if (window.confirm(`确定删除要素 "${feat.name}" 吗？`)) {
                                        onDeleteFeature?.(feat.id);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 text-xs transition"
                                    title="删除该要素"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {/* 列表底部快捷按钮：在此图层新建要素 */}
                          <button
                            onClick={() => {
                              onSelectActiveLayer(layer.id);
                              onClose();
                              onStartPlotting?.();
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-dashed border-blue-500/30 text-blue-300 font-semibold text-xs active:scale-[0.99] transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>在「{layer.name}」新建要素</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </MobileBottomSheet>
  );
};
