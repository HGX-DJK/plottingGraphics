import React from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  Sliders,
  Palette,
  Layers,
  Trash2,
  Type,
  FileText,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobilePropertySheetProps {
  isOpen: boolean;
  onClose: () => void;
  feature: PlotFeature | null;
  layers: PlotLayer[];
  onUpdateFeature: (updated: PlotFeature) => void;
  onDeleteFeature: (featureId: string) => void;
}

export const MobilePropertySheet: React.FC<MobilePropertySheetProps> = ({
  isOpen,
  onClose,
  feature,
  layers,
  onUpdateFeature,
  onDeleteFeature,
}) => {
  if (!feature) return null;

  const handleNameChange = (name: string) => {
    onUpdateFeature({ ...feature, name, updatedAt: Date.now() });
  };

  const handleLayerChange = (layerId: string) => {
    onUpdateFeature({ ...feature, layerId, updatedAt: Date.now() });
  };

  const handlePropChange = (key: string, value: any) => {
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
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="要素属性配置"
      icon={<Sliders className="w-4 h-4" />}
      headerAction={
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
          {feature.type}
        </span>
      }
    >
      <div className="space-y-4 pb-4 text-xs">
        {/* 名称 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1">要素名称</label>
          <input
            type="text"
            value={feature.name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 归属图层 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-gray-500" />
            <span>归属图层</span>
          </label>
          <select
            value={feature.layerId}
            onChange={(e) => handleLayerChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 focus:outline-none focus:border-blue-500"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* 文字与标签 */}
        {isTextOrMarker && (
          <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-sky-400" />
                <span>注记显示文本</span>
              </label>
              <input
                type="text"
                value={feature.properties.text || ''}
                onChange={(e) => handlePropChange('text', e.target.value)}
                placeholder="地图显示标签内容"
                className="w-full px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-gray-100"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-400">文字颜色</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={feature.properties.textColor || '#ffffff'}
                  onChange={(e) => handlePropChange('textColor', e.target.value)}
                  className="w-8 h-7 bg-transparent rounded cursor-pointer"
                />
                <span className="font-mono text-gray-400">
                  {feature.properties.textColor || '#ffffff'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 边框线条与颜色 */}
        <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-gray-400 font-medium flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-gray-500" />
              <span>边框/线条颜色</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={feature.properties.strokeColor}
                onChange={(e) => handlePropChange('strokeColor', e.target.value)}
                className="w-8 h-7 bg-transparent rounded cursor-pointer"
              />
              <span className="font-mono text-gray-400">
                {feature.properties.strokeColor}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-gray-400 mb-1">
              <span>线条粗细</span>
              <span className="font-mono text-blue-400 font-bold">
                {feature.properties.strokeWidth} px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={feature.properties.strokeWidth}
              onChange={(e) => handlePropChange('strokeWidth', parseInt(e.target.value))}
              className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePropChange('strokeDasharray', 'solid')}
                className={`py-1.5 rounded-lg border text-center transition ${
                  feature.properties.strokeDasharray !== 'dash'
                    ? 'border-blue-500 bg-blue-500/20 text-white font-medium'
                    : 'border-gray-800 bg-gray-900 text-gray-400'
                }`}
              >
                实线
              </button>
              <button
                type="button"
                onClick={() => handlePropChange('strokeDasharray', 'dash')}
                className={`py-1.5 rounded-lg border text-center transition ${
                  feature.properties.strokeDasharray === 'dash'
                    ? 'border-blue-500 bg-blue-500/20 text-white font-medium'
                    : 'border-gray-800 bg-gray-900 text-gray-400'
                }`}
              >
                虚线
              </button>
            </div>
          </div>
        </div>

        {/* 区域填充 */}
        {isPolygonLike && (
          <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-400 font-medium">填充颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={feature.properties.fillColor}
                  onChange={(e) => handlePropChange('fillColor', e.target.value)}
                  className="w-8 h-7 bg-transparent rounded cursor-pointer"
                />
                <span className="font-mono text-gray-400">
                  {feature.properties.fillColor}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-gray-400 mb-1">
                <span>填充透明度</span>
                <span className="font-mono text-blue-400 font-bold">
                  {Math.round(feature.properties.fillOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={feature.properties.fillOpacity}
                onChange={(e) => handlePropChange('fillOpacity', parseFloat(e.target.value))}
                className="w-full accent-blue-500 h-2 bg-gray-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 备注 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>战术任务备注</span>
          </label>
          <textarea
            rows={2}
            value={feature.properties.notes || ''}
            onChange={(e) => handlePropChange('notes', e.target.value)}
            placeholder="填写任务指示、战术行动或协同内容..."
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 删除按钮 */}
        <div className="pt-2">
          <button
            onClick={() => {
              if (window.confirm(`确定删除要素 "${feature.name}" 吗？`)) {
                onDeleteFeature(feature.id);
                onClose();
              }
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/40 border border-red-800/60 text-red-300 rounded-xl font-medium transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除当前要素</span>
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
