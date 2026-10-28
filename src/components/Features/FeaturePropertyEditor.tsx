import React from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  X,
  Sliders,
  Palette,
  Layers,
  Trash2,
  FileText,
  Type,
  Maximize2,
} from 'lucide-react';

interface FeaturePropertyEditorProps {
  feature: PlotFeature | null;
  layers: PlotLayer[];
  onUpdateFeature: (updated: PlotFeature) => void;
  onDeleteFeature: (featureId: string) => void;
  onClose: () => void;
}

export const FeaturePropertyEditor: React.FC<FeaturePropertyEditorProps> = ({
  feature,
  layers,
  onUpdateFeature,
  onDeleteFeature,
  onClose,
}) => {
  if (!feature) return null;

  const handleNameChange = (name: string) => {
    onUpdateFeature({ ...feature, name, updatedAt: Date.now() });
  };

  const handleLayerChange = (layerId: string) => {
    onUpdateFeature({ ...feature, layerId, updatedAt: Date.now() });
  };

  const handlePropertyChange = (key: string, value: any) => {
    onUpdateFeature({
      ...feature,
      properties: {
        ...feature.properties,
        [key]: value,
      },
      updatedAt: Date.now(),
    });
  };

  const isPolygonLike =
    feature.type === 'polygon' ||
    feature.type === 'rectangle' ||
    feature.type === 'circle' ||
    feature.type.includes('arrow') ||
    feature.type === 'gathering-place' ||
    feature.type === 'sector';

  const isTextOrMarker =
    feature.type === 'text' || feature.type === 'marker' || feature.type.startsWith('post-');

  return (
    <div className="absolute top-4 right-4 z-30 w-80 max-h-[calc(100vh-6rem)] bg-gray-900/95 backdrop-blur-md border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-gray-200 animate-in fade-in slide-in-from-right-4 duration-200">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-950/50">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-semibold text-white">要素属性配置</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">
            {feature.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 属性编辑滚动区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 要素名称 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1">要素名称</label>
          <input
            type="text"
            value={feature.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 所属图层 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-500" />
            <span>归属图层</span>
          </label>
          <select
            value={feature.layerId}
            onChange={(e) => handleLayerChange(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* 文字与注记内容 */}
        {isTextOrMarker && (
          <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-lg space-y-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-sky-400" />
                <span>注记显示文本</span>
              </label>
              <input
                type="text"
                value={feature.properties.text || ''}
                onChange={(e) => handlePropertyChange('text', e.target.value)}
                placeholder="地图显示标签内容"
                className="w-full px-2.5 py-1.5 bg-gray-900 border border-gray-700 rounded text-gray-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-gray-400 mb-1">文字大小</label>
                <input
                  type="number"
                  min={10}
                  max={28}
                  value={feature.properties.textSize || 13}
                  onChange={(e) => handlePropertyChange('textSize', parseInt(e.target.value) || 13)}
                  className="w-full px-2 py-1 bg-gray-900 border border-gray-700 rounded text-gray-100"
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-1">文字颜色</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={feature.properties.textColor || '#ffffff'}
                    onChange={(e) => handlePropertyChange('textColor', e.target.value)}
                    className="w-8 h-7 bg-transparent cursor-pointer rounded"
                  />
                  <span className="font-mono text-gray-400 text-[11px]">
                    {feature.properties.textColor || '#ffffff'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 线条与边框样式 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 font-medium flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-gray-500" />
              <span>边框/线条颜色</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={feature.properties.strokeColor}
                onChange={(e) => handlePropertyChange('strokeColor', e.target.value)}
                className="w-7 h-6 bg-transparent cursor-pointer rounded"
              />
              <span className="font-mono text-gray-400 text-[11px]">
                {feature.properties.strokeColor}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span>线条粗细</span>
              <span className="font-mono text-gray-200">{feature.properties.strokeWidth} px</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={feature.properties.strokeWidth}
              onChange={(e) => handlePropertyChange('strokeWidth', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-gray-400 mb-1">线型样式</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePropertyChange('strokeDasharray', 'solid')}
                className={`py-1 rounded border text-center transition ${
                  feature.properties.strokeDasharray !== 'dash'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-800 bg-gray-950 text-gray-400'
                }`}
              >
                实线 (Solid)
              </button>
              <button
                type="button"
                onClick={() => handlePropertyChange('strokeDasharray', 'dash')}
                className={`py-1 rounded border text-center transition ${
                  feature.properties.strokeDasharray === 'dash'
                    ? 'border-blue-500 bg-blue-500/20 text-white'
                    : 'border-gray-800 bg-gray-950 text-gray-400'
                }`}
              >
                虚线 (Dashed)
              </button>
            </div>
          </div>
        </div>

        {/* 区域填充配置 */}
        {isPolygonLike && (
          <div className="space-y-3 pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <label className="text-gray-400 font-medium">区域填充颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={feature.properties.fillColor}
                  onChange={(e) => handlePropertyChange('fillColor', e.target.value)}
                  className="w-7 h-6 bg-transparent cursor-pointer rounded"
                />
                <span className="font-mono text-gray-400 text-[11px]">
                  {feature.properties.fillColor}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span>填充不透明度</span>
                <span className="font-mono text-gray-200">
                  {Math.round(feature.properties.fillOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={feature.properties.fillOpacity}
                onChange={(e) => handlePropertyChange('fillOpacity', parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 圆形半径 */}
        {feature.type === 'circle' && (
          <div className="pt-2 border-t border-gray-800">
            <label className="block text-gray-400 font-medium mb-1">覆盖半径 (米)</label>
            <input
              type="number"
              min={100}
              max={50000}
              step={100}
              value={feature.properties.radius || 1500}
              onChange={(e) => handlePropertyChange('radius', parseInt(e.target.value) || 1500)}
              className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-700 rounded text-gray-100"
            />
          </div>
        )}

        {/* 战术说明 / 备注 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>战术任务备注 / 描述</span>
          </label>
          <textarea
            rows={2}
            value={feature.properties.notes || ''}
            onChange={(e) => handlePropertyChange('notes', e.target.value)}
            placeholder="填写战术意图、兵力编成或任务指示..."
            className="w-full px-2.5 py-1.5 bg-gray-950 border border-gray-700 rounded-lg text-gray-200 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* 底部删除按钮 */}
      <div className="p-3 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
        <span className="text-[10px] text-gray-500 font-mono">
          ID: {feature.id.slice(0, 14)}...
        </span>
        <button
          onClick={() => {
            if (window.confirm(`确认删除要素 "${feature.name}" 吗？`)) {
              onDeleteFeature(feature.id);
            }
          }}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-300 rounded-lg text-xs font-medium transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>删除此要素</span>
        </button>
      </div>
    </div>
  );
};
