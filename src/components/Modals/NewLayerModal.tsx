import React, { useState } from 'react';
import { PlotLayer } from '../../types';
import { X, Layers, Palette } from 'lucide-react';

interface NewLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateLayer: (layer: Omit<PlotLayer, 'id' | 'createdAt'>) => void;
}

const PRESET_COLORS = [
  { name: '红方突击红', hex: '#ef4444' },
  { name: '蓝方防御蓝', hex: '#3b82f6' },
  { name: '保障勤务绿', hex: '#10b981' },
  { name: '预警警戒黄', hex: '#f59e0b' },
  { name: '特种力量紫', hex: '#8b5cf6' },
  { name: '网络电磁青', hex: '#06b6d4' },
  { name: '中立未知灰', hex: '#94a3b8' },
  { name: '重点目标橙', hex: '#f97316' },
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 标题 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2.5 text-blue-400 font-semibold text-base">
            <Layers className="w-5 h-5 text-blue-500" />
            <span>新建标绘图层</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              图层名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="例如: 某预备役机动防线 / 态势一号案"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-950 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-gray-400" />
              <span>图层主题标识色</span>
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {PRESET_COLORS.map((item) => (
                <button
                  type="button"
                  key={item.hex}
                  onClick={() => setColor(item.hex)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition ${
                    color === item.hex
                      ? 'border-blue-500 bg-blue-500/10 text-white font-medium shadow-sm'
                      : 'border-gray-800 hover:border-gray-700 bg-gray-950/50 text-gray-400'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow"
                    style={{ backgroundColor: item.hex }}
                  />
                  <span className="truncate">{item.name.slice(0, 4)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              图层战术描述 / 说明
            </label>
            <textarea
              rows={3}
              placeholder="记录该图层负责的推演任务、编制单位或标绘说明..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-950 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg text-sm shadow-lg shadow-blue-500/20 transition"
            >
              立即创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
