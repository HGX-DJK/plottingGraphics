import React, { useState } from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  Sliders,
  Palette,
  Layers,
  Trash2,
  Type,
  FileText,
  Compass,
  Ruler,
  Maximize2,
  Tag,
  Plus,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { formatArea, formatDistance } from '../../utils/geoUtils';

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
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleAddCustomAttribute = () => {
    if (!newAttrKey.trim()) return;
    const existing = feature.properties.customAttributes || {};
    handlePropChange('customAttributes', {
      ...existing,
      [newAttrKey.trim()]: newAttrVal.trim(),
    });
    setNewAttrKey('');
    setNewAttrVal('');
    setShowAddAttr(false);
  };

  const handleDeleteCustomAttribute = (key: string) => {
    const existing = { ...(feature.properties.customAttributes || {}) };
    delete existing[key];
    handlePropChange('customAttributes', existing);
  };

  const isPolygonLike =
    feature.type === 'polygon' ||
    feature.type === 'rectangle' ||
    feature.type === 'circle' ||
    feature.type.includes('arrow') ||
    feature.type === 'gathering-place' ||
    feature.type === 'sector';

  const isTextOrPoint =
    feature.type === 'text' ||
    feature.type === 'marker' ||
    feature.type.startsWith('point-') ||
    feature.type.startsWith('post-');

  const pointCoord = feature.coordinates[0];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="GIS 要素属性与指标"
      icon={<Sliders className="w-4 h-4" />}
      headerAction={
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
          {feature.type}
        </span>
      }
    >
      <div className="space-y-4 pb-4 text-xs">
        {/* 1. GIS 空间几何量算指标卡 (GISer 核心) */}
        <div className="p-3 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-gray-300 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-blue-400">
              <Compass className="w-3.5 h-3.5" />
              <span>空间几何指标</span>
            </span>
            <span className="text-gray-500 font-mono text-[10px]">WGS84 / EPSG:4326</span>
          </div>

          {/* 点坐标 */}
          {isTextOrPoint && pointCoord && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-gray-950/70 border border-gray-800/80 font-mono text-[11px]">
              <div>
                <span className="text-gray-400">经度: </span>
                <span className="text-gray-200">{pointCoord[0].toFixed(5)}°</span>
                <span className="text-gray-600 mx-2">|</span>
                <span className="text-gray-400">纬度: </span>
                <span className="text-gray-200">{pointCoord[1].toFixed(5)}°</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${pointCoord[0]},${pointCoord[1]}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="p-1 rounded text-gray-400 hover:text-blue-400 transition"
                title="复制坐标"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* 面积与周长指标 */}
          {isPolygonLike && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800/80">
                <div className="text-gray-400 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-emerald-400" />
                  <span>计算面积</span>
                </div>
                <div className="font-bold text-gray-100 font-mono mt-0.5 truncate">
                  {feature.properties.calculatedArea
                    ? formatArea(feature.properties.calculatedArea)
                    : feature.properties.radius
                    ? formatArea(Math.PI * feature.properties.radius * feature.properties.radius)
                    : '自动多边形测算'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800/80">
                <div className="text-gray-400 flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-cyan-400" />
                  <span>边界周长</span>
                </div>
                <div className="font-bold text-gray-100 font-mono mt-0.5 truncate">
                  {feature.properties.calculatedLength
                    ? formatDistance(feature.properties.calculatedLength)
                    : feature.properties.radius
                    ? formatDistance(2 * Math.PI * feature.properties.radius)
                    : '自动计算'}
                </div>
              </div>
            </div>
          )}

          {/* 线要素长度指标 */}
          {(feature.type === 'polyline' || feature.type === 'freehand') && (
            <div className="p-2 rounded-lg bg-gray-950/70 border border-gray-800/80 flex items-center justify-between text-[11px]">
              <div className="text-gray-400 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                <span>折线空间总长度:</span>
              </div>
              <div className="font-bold text-gray-100 font-mono">
                {formatDistance(feature.properties.calculatedLength || 0)}
              </div>
            </div>
          )}
        </div>

        {/* 2. 基本属性 */}
        <div className="space-y-3">
          <div>
            <label className="block text-gray-400 font-medium mb-1">要素名称</label>
            <input
              type="text"
              value={feature.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>

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
        </div>

        {/* 3. GIS 自定义业务属性表 (Attribute Table) */}
        <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium flex items-center gap-1 text-[11px]">
              <Tag className="w-3.5 h-3.5 text-blue-400" />
              <span>GIS 业务属性字段</span>
            </span>
            <button
              onClick={() => setShowAddAttr(!showAddAttr)}
              className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
            >
              <Plus className="w-3 h-3" />
              <span>添加字段</span>
            </button>
          </div>

          {showAddAttr && (
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="字段名 (如 用地性质)"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  className="px-2 py-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-gray-100"
                />
                <input
                  type="text"
                  placeholder="字段值 (如 居住用地)"
                  value={newAttrVal}
                  onChange={(e) => setNewAttrVal(e.target.value)}
                  className="px-2 py-1.5 bg-gray-950 border border-gray-700 rounded text-xs text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddAttr(false)}
                  className="px-2 py-1 text-[10px] text-gray-400 rounded hover:bg-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleAddCustomAttribute}
                  className="px-3 py-1 text-[10px] bg-blue-600 text-white font-medium rounded hover:bg-blue-500"
                >
                  确定添加
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {feature.properties.customAttributes &&
            Object.keys(feature.properties.customAttributes).length > 0 ? (
              Object.entries(feature.properties.customAttributes).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between p-2 rounded-lg bg-gray-900/60 border border-gray-800/80 text-[11px]"
                >
                  <span className="text-gray-400 font-medium">{k}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-200">{v}</span>
                    <button
                      onClick={() => handleDeleteCustomAttribute(k)}
                      className="text-gray-500 hover:text-red-400 p-0.5"
                      title="删除字段"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-gray-500 italic py-1">
                暂无扩展业务属性，可点击右上角添加
              </div>
            )}
          </div>
        </div>

        {/* 4. 文字注记 */}
        {isTextOrPoint && (
          <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
            <div>
              <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-sky-400" />
                <span>地图注记文字</span>
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

        {/* 5. 符号化与样式 (边框线条与填充) */}
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
              <span>线宽粗细</span>
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
                实线 (Solid)
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
                虚线 (Dash)
              </button>
            </div>
          </div>
        </div>

        {/* 区域填充 */}
        {isPolygonLike && (
          <div className="p-3 bg-gray-950 rounded-xl border border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-gray-400 font-medium">区域填充色</label>
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
                <span>填充不透明度</span>
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

        {/* 备注说明 */}
        <div>
          <label className="block text-gray-400 font-medium mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span>外业调查与地物说明</span>
          </label>
          <textarea
            rows={2}
            value={feature.properties.notes || ''}
            onChange={(e) => handlePropChange('notes', e.target.value)}
            placeholder="填写现场核查记录、规划指标或地物说明..."
            className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-gray-200 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 删除要素 */}
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
            <span>删除当前 GIS 要素</span>
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
