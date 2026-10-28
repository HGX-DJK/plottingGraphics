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
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

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
}) => {
  const [expandedLayerId, setExpandedLayerId] = useState<string | null>(null);

  const getCount = (layerId: string) => {
    return features.filter((f) => f.layerId === layerId).length;
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
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-xs font-semibold shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>新建图层</span>
        </button>
      }
    >
      <div className="space-y-3 pb-4">
        <div className="text-[11px] text-gray-400 px-1">
          点击图层可直接切换为当前标绘工作层，新标绘要素将自动归入该图层。
        </div>

        {layers.map((layer) => {
          const isActive = layer.id === activeLayerId;
          const count = getCount(layer.id);
          const isExpanded = expandedLayerId === layer.id;

          return (
            <div
              key={layer.id}
              className={`rounded-2xl border transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-950/30 shadow-lg ring-1 ring-blue-500/40'
                  : 'border-gray-800 bg-gray-950/70'
              }`}
            >
              <div className="p-3.5">
                {/* 核心行：激活选择、颜色、名称、计数、显隐、锁定 */}
                <div className="flex items-center justify-between gap-2">
                  <div
                    onClick={() => onSelectActiveLayer(layer.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                  >
                    <div
                      className="w-4 h-4 rounded-full shrink-0 shadow ring-2 ring-white/10"
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
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        共 {count} 个要素
                      </div>
                    </div>
                  </div>

                  {/* 显隐与锁定按钮 */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onToggleVisibility(layer.id)}
                      className={`p-2 rounded-xl transition ${
                        layer.visible
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-gray-600 bg-gray-900'
                      }`}
                      title="显隐"
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
                      title="锁定"
                    >
                      {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>

                    <button
                      onClick={() => setExpandedLayerId(isExpanded ? null : layer.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-white bg-gray-900 transition"
                      title="展开调节"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 展开的透明度与删除区 */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-800/80 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-300 mb-1">
                        <span>图层透明度</span>
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
                      <span className="text-[10px] text-gray-500">
                        {layer.description || '无图层备注'}
                      </span>

                      {layers.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(`确定删除图层 "${layer.name}" 及包含的全部要素吗？`)) {
                              onDeleteLayer(layer.id);
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-950/30 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>删除</span>
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
    </MobileBottomSheet>
  );
};
