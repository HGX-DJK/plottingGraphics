import React, { useState, useMemo } from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import { X, Layers, Ruler, Check, Sparkles } from 'lucide-react';
import { generateBufferPolygon, calculateSphericalPolygonArea, formatArea } from '../../utils/geoUtils';

interface BufferModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: PlotFeature | null;
  layers: PlotLayer[];
  activeLayerId: string;
  onCreateFeature: (feature: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onNotify?: (message: string) => void;
}

const PRESET_DISTANCES = [20, 50, 100, 200, 500, 1000];

export const BufferModal: React.FC<BufferModalProps> = ({
  isOpen,
  onClose,
  feature,
  layers,
  activeLayerId,
  onCreateFeature,
  onNotify,
}) => {
  const [bufferDistance, setBufferDistance] = useState<number>(50);
  const [targetLayerId, setTargetLayerId] = useState<string>(activeLayerId);
  const [customDistanceStr, setCustomDistanceStr] = useState<string>('50');

  // 计算预览外延缓冲区的面积
  const estimatedBufferArea = useMemo(() => {
    if (!feature) return 0;
    try {
      const ring = generateBufferPolygon(feature, bufferDistance);
      if (ring && ring.length >= 3) {
        return calculateSphericalPolygonArea(ring);
      }
    } catch (e) {}
    return 0;
  }, [feature, bufferDistance]);

  if (!isOpen || !feature) return null;

  const handleSelectPreset = (dist: number) => {
    setBufferDistance(dist);
    setCustomDistanceStr(dist.toString());
  };

  const handleCustomDistanceChange = (val: string) => {
    setCustomDistanceStr(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setBufferDistance(num);
    }
  };

  const handleGenerate = () => {
    if (!feature) return;
    const ring = generateBufferPolygon(feature, bufferDistance);
    if (!ring || ring.length < 3) {
      onNotify?.('⚠️ 生成缓冲区失败，要素控制点不足');
      return;
    }

    const targetLayer = layers.find((l) => l.id === targetLayerId) || layers[0];
    const themeColor = targetLayer?.color || '#06b6d4';
    const area = calculateSphericalPolygonArea(ring);

    onCreateFeature({
      name: `${feature.name}_${bufferDistance}m缓冲区`,
      type: 'polygon',
      layerId: targetLayerId,
      coordinates: ring,
      properties: {
        strokeColor: themeColor,
        strokeWidth: 2,
        strokeDasharray: 'dash',
        fillColor: themeColor,
        fillOpacity: 0.25,
        text: `${bufferDistance}m缓冲带`,
        textColor: '#ffffff',
        textSize: 12,
        notes: `由要素「${feature.name}」外延 ${bufferDistance} 米空间缓冲区自动生成`,
        isBufferPolygon: true,
        bufferDistance,
        bufferSourceId: feature.id,
        calculatedArea: area,
      },
    });

    onNotify?.(`✓ 已成功生成「${feature.name}」的 ${bufferDistance}m 空间缓冲区多边形`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white dark:bg-gray-900 border border-slate-200/90 dark:border-gray-800 shadow-2xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Ruler className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                动态空间缓冲区分析
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                源要素: {feature.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 缓冲距离预设药丸 */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-gray-300">
            缓冲扩展距离 (米 / Meters)
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_DISTANCES.map((dist) => (
              <button
                key={dist}
                type="button"
                onClick={() => handleSelectPreset(dist)}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold font-mono transition border ${
                  bufferDistance === dist
                    ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-600/30'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-transparent hover:bg-slate-200 dark:hover:bg-gray-700'
                }`}
              >
                {dist} 米
              </button>
            ))}
          </div>

          {/* 自定义米数输入 */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-500 dark:text-gray-400 shrink-0">精确自定义:</span>
            <div className="relative flex-1">
              <input
                type="number"
                min="1"
                max="50000"
                value={customDistanceStr}
                onChange={(e) => handleCustomDistanceChange(e.target.value)}
                className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs font-mono text-slate-800 dark:text-gray-200 focus:outline-none focus:border-cyan-500"
                placeholder="输入米数..."
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                m
              </span>
            </div>
          </div>
        </div>

        {/* 目标归属图层选择 */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>生成至目标图层</span>
          </label>
          <select
            value={targetLayerId}
            onChange={(e) => setTargetLayerId(e.target.value)}
            className="w-full h-9 px-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-xs text-slate-800 dark:text-gray-200 focus:outline-none focus:border-cyan-500"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* 估算测算指标卡片 */}
        <div className="p-3 rounded-2xl bg-cyan-50/70 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/40 text-xs text-cyan-900 dark:text-cyan-200 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <span className="font-semibold">估算缓冲覆盖面积:</span>
          </div>
          <span className="font-mono font-bold text-cyan-700 dark:text-cyan-300">
            {formatArea(estimatedBufferArea)}
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold transition"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            className="flex-[1.5] py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>生成缓冲区要素</span>
          </button>
        </div>
      </div>
    </div>
  );
};
