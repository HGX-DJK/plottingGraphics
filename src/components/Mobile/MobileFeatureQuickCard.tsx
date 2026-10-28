import React from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  Crosshair,
  Sliders,
  Trash2,
  X,
  Hexagon,
  Activity,
  Milestone,
  Square,
  Circle,
  Navigation,
  Radio,
  Type,
  Pencil,
  Sparkles,
} from 'lucide-react';
import { formatDistance, calculateAzimuth } from '../../utils/geoUtils';

interface MobileFeatureQuickCardProps {
  feature: PlotFeature | null;
  layer: PlotLayer | undefined;
  onFocus: () => void;
  onOpenProperties: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const MobileFeatureQuickCard: React.FC<MobileFeatureQuickCardProps> = ({
  feature,
  layer,
  onFocus,
  onOpenProperties,
  onDelete,
  onClose,
}) => {
  if (!feature) return null;

  const getFeatureIcon = (type: string) => {
    if (type.includes('arrow')) return Navigation;
    if (type === 'gathering-place') return Sparkles;
    if (type === 'sector' || type.startsWith('post-')) return Radio;
    if (type === 'text') return Type;
    if (type === 'polyline' || type === 'freehand') return Activity;
    if (type === 'rectangle') return Square;
    if (type === 'circle') return Circle;
    if (type === 'marker' || type.startsWith('point-')) return Milestone;
    return Hexagon;
  };

  const Icon = getFeatureIcon(feature.type);

  // 格式化空间指标展示 (专业 GIS 面积、周长与方位角)
  const renderSpatialMetrics = () => {
    if (feature.properties.calculatedArea) {
      const area = feature.properties.calculatedArea;
      const areaStr = area >= 10000 ? `${(area / 1000000).toFixed(3)} km²` : `${Math.round(area).toLocaleString()} m²`;
      const muStr = `${(area * 0.0015).toFixed(2)} 亩`;
      const perimStr = feature.properties.calculatedLength
        ? ` | 周长 ${formatDistance(feature.properties.calculatedLength)}`
        : '';
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono font-bold">
          {areaStr} ({muStr}){perimStr}
        </span>
      );
    }
    if (feature.properties.calculatedLength) {
      let azText = '';
      if (feature.coordinates && feature.coordinates.length >= 2) {
        const az = calculateAzimuth(
          feature.coordinates[0],
          feature.coordinates[feature.coordinates.length - 1]
        );
        azText = ` | 方位: ${az.text}`;
      }
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono font-bold">
          长度 {formatDistance(feature.properties.calculatedLength)}{azText}
        </span>
      );
    }
    if (feature.coordinates && feature.coordinates[0]) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-300 font-mono">
          {feature.coordinates[0][0].toFixed(4)}°E, {feature.coordinates[0][1].toFixed(4)}°N
        </span>
      );
    }
    return null;
  };

  return (
    <div className="absolute bottom-20 left-3 right-3 z-30 pointer-events-auto bg-gray-950/90 backdrop-blur-xl border border-blue-500/40 rounded-2xl p-3 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
      <div className="flex items-center justify-between gap-2.5">
        {/* 左侧：要素标识与图层信息 */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner"
            style={{
              backgroundColor: `${layer?.color || '#3b82f6'}20`,
              borderColor: `${layer?.color || '#3b82f6'}40`,
              color: layer?.color || '#3b82f6',
            }}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: layer?.color || '#3b82f6' }}
              />
              <span className="text-xs font-black text-gray-100 truncate">
                {feature.name}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1 truncate">
              <span className="text-[10px] text-gray-400">
                {layer?.name || '默认图层'}
              </span>
              {renderSpatialMetrics()}
            </div>
          </div>
        </div>

        {/* 右侧：快捷操作组 */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 居中聚焦 */}
          <button
            onClick={onFocus}
            className="p-2 rounded-xl bg-gray-900 border border-gray-800 text-blue-400 active:bg-gray-800 transition shadow-sm"
            title="地图聚焦"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* 属性详情与编辑 */}
          <button
            onClick={onOpenProperties}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs active:bg-blue-500 shadow-md shadow-blue-600/30 transition"
            title="查看属性与样式"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>属性</span>
          </button>

          {/* 快捷删除 */}
          <button
            onClick={() => {
              if (window.confirm(`确定删除要素 "${feature.name}" 吗？`)) {
                onDelete();
              }
            }}
            className="p-2 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 active:bg-red-900/40 transition"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* 关闭快显卡片 */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white active:bg-gray-800 transition"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
