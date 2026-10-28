import React, { useState } from 'react';
import { PlotLayer, PlotFeature } from '../../types';
import {
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Sliders,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ConfirmModal } from '../Modals/ConfirmModal';

interface LayerManagerProps {
  layers: PlotLayer[];
  features: PlotFeature[];
  activeLayerId: string;
  onSelectActiveLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onChangeOpacity: (layerId: string, opacity: number) => void;
  onDeleteLayer: (layerId: string) => void;
  onOpenNewLayerModal: () => void;
}

export const LayerManager: React.FC<LayerManagerProps> = ({
  layers,
  features,
  activeLayerId,
  onSelectActiveLayer,
  onToggleVisibility,
  onToggleLock,
  onChangeOpacity,
  onDeleteLayer,
  onOpenNewLayerModal,
}) => {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);
  const [layerToDelete, setLayerToDelete] = useState<PlotLayer | null>(null);

  const getFeatureCount = (layerId: string) => {
    return features.filter((f) => f.layerId === layerId).length;
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 text-gray-200 select-none">
      {/* 头部与操作区 */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="text-sm font-semibold tracking-wide text-white">图层协同管理</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-mono">
            {layers.length}
          </span>
        </div>

        <button
          onClick={onOpenNewLayerModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-md shadow-blue-500/20 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建图层</span>
        </button>
      </div>

      <div className="px-4 py-2 bg-blue-950/20 border-b border-blue-900/30 text-[11px] text-blue-300 flex items-center justify-between">
        <span>当前绘制工作层: <strong>{layers.find((l) => l.id === activeLayerId)?.name || '未选'}</strong></span>
        <span className="text-gray-400">点击图层可切换</span>
      </div>

      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const count = getFeatureCount(layer.id);
          const isExpanded = expandedLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={`rounded-xl border transition-all duration-150 ${
                isActive
                  ? 'border-blue-500/60 bg-blue-950/30 shadow-lg shadow-blue-950/30 ring-1 ring-blue-500/30'
                  : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
              }`}
            >
              <div className="p-3">
                {/* 顶栏：单选激活、颜色、图层名、显隐/锁定按钮 */}
                <div className="flex items-center justify-between gap-2">
                  <div
                    onClick={() => onSelectActiveLayer(layer.id)}
                    className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm ring-2 ring-white/10"
                      style={{ backgroundColor: layer.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-100 truncate">
                          {layer.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-medium shrink-0">
                            绘制中
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{count} 个标绘要素</span>
                        {layer.description && (
                          <span className="truncate max-w-[120px] text-gray-500">
                            • {layer.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 图层快捷控制按钮 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleVisibility(layer.id)}
                      title={layer.visible ? '隐藏该图层' : '显示该图层'}
                      className={`p-1.5 rounded-lg transition ${
                        layer.visible
                          ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                          : 'text-gray-600 hover:text-gray-400 bg-gray-900'
                      }`}
                    >
                      {layer.visible ? (
                        <Eye className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    <button
                      onClick={() => onToggleLock(layer.id)}
                      title={layer.locked ? '图层已锁定' : '锁定图层'}
                      className={`p-1.5 rounded-lg transition ${
                        layer.locked
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      onClick={() => setExpandedLayerId(isExpanded ? null : layer.id)}
                      className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition"
                      title="展开图层调节"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* 展开面板：透明度滑块与图层删除 */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5" />
                        图层透明度
                      </span>
                      <span className="font-mono text-gray-200">
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
                      className="w-full accent-blue-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
                    />

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-gray-500">
                        创建时间: {new Date(layer.createdAt).toLocaleDateString()}
                      </span>

                      {layers.length > 1 && (
                        <button
                          onClick={() => setLayerToDelete(layer)}
                          className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-950/30 transition"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>删除图层</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 中文定制确认弹窗 */}
      <ConfirmModal
        isOpen={!!layerToDelete}
        onClose={() => setLayerToDelete(null)}
        onConfirm={() => {
          if (layerToDelete) {
            onDeleteLayer(layerToDelete.id);
          }
          setLayerToDelete(null);
        }}
        title="删除图层确认"
        message={`确定删除图层 "${layerToDelete?.name}" 及其包含的全部要素吗？删除后不可恢复。`}
        confirmText="确定删除"
        cancelText="取消"
        type="danger"
      />

      {/* 底部小提示 */}
      <div className="p-3 bg-gray-950/80 border-t border-gray-800/80 text-[11px] text-gray-400 flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>支持多图层分层管控、独立显隐与透明度调节</span>
      </div>
    </div>
  );
};
