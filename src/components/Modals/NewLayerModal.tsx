import React, { useState } from 'react';
import { PlotLayer } from '../../types';
import { X, Layers, Palette, Check } from 'lucide-react';

interface NewLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLayer: (layer: Omit<PlotLayer, 'id' | 'createdAt'>) => void;
}

const PRESET_COLORS = [
  { name: '规划红线', hex: '#ef4444' },
  { name: '江河水系', hex: '#3b82f6' },
  { name: '生态绿化', hex: '#10b981' },
  { name: '管制边界', hex: '#f59e0b' },
  { name: '重点设施', hex: '#8b5cf6' },
  { name: '勘界廊道', hex: '#06b6d4' },
  { name: '基准参照', hex: '#94a3b8' },
  { name: '地灾隐患', hex: '#f97316' },
];

export const NewLayerModal: React.FC<NewLayerModalProps> = ({
  isOpen,
  onClose,
  onCreateLayer,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0].hex);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateLayer({
      name: name.trim(),
      color,
      visible: true,
      locked: false,
      opacity: 0.9,
      description: description.trim(),
    });

    setName('');
    setDescription('');
    onClose();
  };

  const selectedColorItem = PRESET_COLORS.find((c) => c.hex === color) || PRESET_COLORS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center gap-2.5 text-blue-400 font-bold text-sm">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <span>新建标绘图层</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-0.5">
              图层名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如: 城市空间规划红线 / 水系保护范围"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
              autoFocus
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 ml-0.5">
              <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-blue-400" />
                <span>图层主题标识色</span>
              </label>
              <span className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: selectedColorItem.hex }}
                />
                <span className="text-gray-200">{selectedColorItem.name}</span>
              </span>
            </div>

            {/* 现代化色彩选择网格 (大触控圆点 + 清晰中文标签，杜绝省略号截断) */}
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((item) => {
                const isSelected = color === item.hex;
                return (
                  <button
                    type="button"
                    key={item.hex}
                    onClick={() => setColor(item.hex)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border transition active:scale-95 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/15 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30'
                        : 'border-gray-800 bg-gray-950/80 hover:border-gray-700 hover:bg-gray-900/60'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shadow-md mb-1.5 transition-transform"
                      style={{ backgroundColor: item.hex }}
                    >
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-white stroke-[3] drop-shadow" />
                      )}
                    </div>
                    <span
                      className={`text-[10.5px] leading-tight font-medium tracking-tight ${
                        isSelected ? 'text-white font-bold' : 'text-gray-400'
                      }`}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 ml-0.5">
              图层业务描述 / 说明
            </label>
            <textarea
              rows={2}
              placeholder="记录该图层的标绘目的、责任工程师或管理要求（选填）..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none transition shadow-inner"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl text-xs text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 transition"
            >
              立即创建图层
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
