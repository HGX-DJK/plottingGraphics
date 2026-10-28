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
import { ConfirmModal } from '../Modals/ConfirmModal';
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
  // 记录每个图层树分支的折叠/展开状态（默认当前工作图层展开）
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>(() => ({
    [activeLayerId]: true,
  }));

  // 记录哪个图层的透明度调节面板处于打开状态（默认收起，保持极简视觉）
  const [sliderLayerId, setSliderLayerId] = useState<string | null>(null);

  // 中文定制二次确认弹窗状态（彻底杜绝系统原生 CANCEL / OK 弹窗）
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'feature' | 'layer';
    id: string;
    name: string;
    count?: number;
  } | null>(null);

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
      title="图层管控中心"
      icon={<Layers className="w-4 h-4" />}
      headerAction={
        <button
          onClick={() => {
            onClose();
            onOpenNewLayerModal();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建图层</span>
        </button>
      }
    >
      <div className="space-y-3 pb-4">
        {/* 顶部专业统计胶囊栏 (单行排版，永不折行挤压) */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-slate-300 font-medium text-[11px]">GIS 空间图层与要素树</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-slate-400">{layers.length} 个图层</span>
            <span className="text-slate-600">•</span>
            <span className="text-blue-400 font-bold">{features.length} 个要素</span>
          </div>
        </div>

        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const layerFeatures = features.filter((f) => f.layerId === layer.id);
          const isExpanded = expandedMap[layer.id] ?? (isActive || layerFeatures.length > 0);
          const isSliderOpen = sliderLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isActive
                  ? 'border-blue-500/70 bg-gradient-to-b from-blue-950/40 via-slate-900/60 to-slate-950/90 shadow-lg ring-1 ring-blue-500/30'
                  : 'border-slate-800/90 bg-slate-950/70 hover:border-slate-700/80'
              }`}
            >
              <div className="p-3.5 space-y-3">
                {/* 1. 图层主表头行 (两行复合排版，彻底解决标题与按钮挤压截断) */}
                <div className="flex items-start justify-between gap-2.5">
                  {/* 左侧：展开折叠 + 色标 + 标题与元数据 */}
                  <div
                    onClick={() => {
                      onSelectActiveLayer(layer.id);
                      toggleExpand(layer.id);
                    }}
                    className="flex items-start gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    {/* 折叠/展开箭头 */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(layer.id);
                      }}
                      className="mt-0.5 p-1 -ml-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition shrink-0"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-blue-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </button>

                    {/* 图层色标 */}
                    <div className="mt-1 relative shrink-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full ring-2 ring-white/15 shadow-sm"
                        style={{ backgroundColor: layer.color }}
                      />
                    </div>

                    {/* 图层名称与副信息 */}
                    <div className="min-w-0 flex-1">
                      {/* 图层完整名称 */}
                      <div className="text-xs font-bold text-slate-100 leading-snug break-words">
                        {layer.name}
                      </div>

                      {/* 副信息行：工作层状态徽章 + 要素计数 + 显隐/锁定状态 */}
                      <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[11px]">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                            <span>当前工作层</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectActiveLayer(layer.id);
                            }}
                            className="text-[10px] text-slate-400 hover:text-blue-400 transition"
                          >
                            设为工作层
                          </button>
                        )}

                        <span className="text-slate-600">•</span>
                        <span className="text-slate-400 font-mono text-[11px]">
                          <strong className="text-slate-200 font-bold">{layerFeatures.length}</strong> 个要素
                        </span>

                        {!layer.visible && (
                          <span className="text-amber-400/90 text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/20">
                            已隐藏
                          </span>
                        )}
                        {layer.locked && (
                          <span className="text-rose-400/90 text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 border border-rose-500/20">
                            已锁定
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 右侧操作区：极简且触控友好 */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    <button
                      onClick={() => onToggleVisibility(layer.id)}
                      className={`p-1.5 rounded-xl border transition ${
                        layer.visible
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                          : 'text-slate-500 bg-slate-900 border-slate-800 hover:text-slate-300'
                      }`}
                      title={layer.visible ? '隐藏图层' : '显示图层'}
                    >
                      {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setSliderLayerId(isSliderOpen ? null : layer.id)}
                      className={`p-1.5 rounded-xl border transition ${
                        isSliderOpen
                          ? 'text-blue-400 bg-blue-500/20 border-blue-500/30 shadow'
                          : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800'
                      }`}
                      title="图层设置与透明度"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 2. 展开的图层高级设置 (透明度滑块、锁定、删除图层) */}
                {isSliderOpen && (
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium flex items-center gap-1.5">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                        <span>透明度调节</span>
                      </span>
                      <span className="font-mono text-blue-400 font-bold px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-[11px]">
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
                      className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60 text-xs">
                      {/* 图层锁定切换 */}
                      <button
                        onClick={() => onToggleLock(layer.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition ${
                          layer.locked
                            ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                            : 'text-slate-400 bg-slate-900 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        <span>{layer.locked ? '图层已锁定' : '锁定图层'}</span>
                      </button>

                      {/* 删除图层 */}
                      {layers.length > 1 && (
                        <button
                          onClick={() => {
                            setDeleteConfirm({
                              type: 'layer',
                              id: layer.id,
                              name: layer.name,
                              count: layerFeatures.length,
                            });
                          }}
                          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded-lg bg-rose-950/40 border border-rose-900/40 transition"
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
                  <div className="space-y-2 pt-1 border-t border-slate-800/70">
                    {/* 分支表头 */}
                    <div className="flex items-center justify-between px-1 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span
                          className="w-1.5 h-3 rounded-full"
                          style={{ backgroundColor: layer.color }}
                        />
                        <span className="text-slate-300">图层要素</span>
                        <span className="font-mono text-slate-500 font-bold">({layerFeatures.length})</span>
                      </div>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => onSelectActiveLayer(layer.id)}
                          className="text-blue-400 hover:text-blue-300 font-semibold text-[11px] transition"
                        >
                          设为当前绘制层
                        </button>
                      )}
                    </div>

                    {/* 要素列表为空时的状态 */}
                    {layerFeatures.length === 0 ? (
                      <div className="py-3.5 px-3 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center">
                        <div className="text-xs text-slate-400">此图层下暂无要素</div>
                        <button
                          onClick={() => {
                            onSelectActiveLayer(layer.id);
                            onClose();
                            onStartPlotting?.();
                          }}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 active:bg-blue-600/40 border border-blue-500/30 text-blue-300 text-xs font-bold transition"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>在此图层新建标绘</span>
                        </button>
                      </div>
                    ) : (
                      /* 要素列表逐项列出 */
                      <div className="space-y-1.5">
                        {layerFeatures.map((feat) => {
                          const Icon = getFeatureIcon(feat.type);
                          return (
                            <div
                              key={feat.id}
                              className="group flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/80 transition-all shadow-sm"
                            >
                              {/* 点击查看要素属性 */}
                              <div
                                onClick={() => {
                                  onSelectFeature?.(feat.id);
                                  onClose();
                                }}
                                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                                title="点击查看/编辑要素属性"
                              >
                                <div
                                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                                  style={{
                                    backgroundColor: `${layer.color}18`,
                                    borderColor: `${layer.color}40`,
                                    color: layer.color,
                                  }}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-slate-100 truncate">
                                    {feat.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                                    {getFeatureMetric(feat)}
                                  </div>
                                </div>
                              </div>

                              {/* 右侧操作按钮：地图定位与删除 */}
                              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                <button
                                  onClick={() => {
                                    if (onLocateFeature) {
                                      onLocateFeature(feat.id);
                                    } else if (onSelectFeature) {
                                      onSelectFeature(feat.id);
                                    }
                                    onClose();
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 active:bg-blue-500/35 border border-blue-500/30 text-blue-400 text-xs font-medium transition"
                                  title="在地图中居中定位该要素"
                                >
                                  <Crosshair className="w-3 h-3" />
                                  <span>定位</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setDeleteConfirm({
                                      type: 'feature',
                                      id: feat.id,
                                      name: feat.name,
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition"
                                  title="删除该要素"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* 列表底部快捷按钮：在此图层新建要素 (文字简洁，绝不撑破溢出) */}
                        <button
                          onClick={() => {
                            onSelectActiveLayer(layer.id);
                            onClose();
                            onStartPlotting?.();
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 active:bg-blue-600/30 border border-dashed border-blue-500/30 text-blue-300 font-semibold text-xs active:scale-[0.99] transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>在此图层新建标绘</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 中文定制确认弹窗 (取代系统默认 CANCEL / OK) */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm?.type === 'feature') {
            onDeleteFeature?.(deleteConfirm.id);
          } else if (deleteConfirm?.type === 'layer') {
            onDeleteLayer?.(deleteConfirm.id);
          }
          setDeleteConfirm(null);
        }}
        title={deleteConfirm?.type === 'layer' ? '删除图层确认' : '删除要素确认'}
        message={
          deleteConfirm?.type === 'layer'
            ? `确定删除图层 "${deleteConfirm.name}" 及其包含的全部 ${deleteConfirm.count || 0} 个要素吗？删除后不可恢复。`
            : `确定删除要素 "${deleteConfirm?.name}" 吗？删除后将从当前图层和地图中完全移除。`
        }
        confirmText="确定删除"
        cancelText="取消"
        type="danger"
      />
    </MobileBottomSheet>
  );
};
