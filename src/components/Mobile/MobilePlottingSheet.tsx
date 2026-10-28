import React, { useState } from 'react';
import { PlotFeatureType } from '../../types';
import {
  Compass,
  Navigation,
  Crosshair,
  Sparkles,
  Radio,
  Milestone,
  HeartPulse,
  Flame,
  Building2,
  Type,
  Activity,
  Hexagon,
  Square,
  Circle,
  Pencil,
  PenTool,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobilePlottingSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentDrawingTool: PlotFeatureType | null;
  onSelectTool: (tool: PlotFeatureType) => void;
  activeLayerName: string;
  activeLayerColor: string;
}

export const MobilePlottingSheet: React.FC<MobilePlottingSheetProps> = ({
  isOpen,
  onClose,
  currentDrawingTool,
  onSelectTool,
  activeLayerName,
  activeLayerColor,
}) => {
  // 默认定位到 GISer 最核心的基础矢量分类
  const [activeCategory, setActiveCategory] = useState<'shapes' | 'points' | 'arrows'>('shapes');

  // 1. 基础空间几何矢量 (GIS 核心基石)
  const basicShapes = [
    {
      type: 'polygon' as PlotFeatureType,
      name: '多边形 (地块/范围面)',
      desc: '规划控制地块、用地范围闭合面',
      icon: Hexagon,
      badge: 'GIS面',
    },
    {
      type: 'polyline' as PlotFeatureType,
      name: '折线 (路线/走向)',
      desc: '道路廊道、管线轨迹、勘界线',
      icon: Activity,
      badge: 'GIS线',
    },
    {
      type: 'marker' as PlotFeatureType,
      name: '空间位置点 (图钉)',
      desc: '地理坐标基准点、要素落位',
      icon: Milestone,
      badge: 'GIS点',
    },
    {
      type: 'rectangle' as PlotFeatureType,
      name: '矩形框 (搜索网格/BBox)',
      desc: '2点标定标准矩形范围框',
      icon: Square,
      badge: 'BBox',
    },
    {
      type: 'circle' as PlotFeatureType,
      name: '缓冲区 (圆形半径)',
      desc: '空间影响半径、安全缓冲圈',
      icon: Circle,
      badge: 'Buffer',
    },
    {
      type: 'text' as PlotFeatureType,
      name: '空间地物注记 (文本)',
      desc: '地名、规划指标与文字标注',
      icon: Type,
      badge: '注记',
    },
    {
      type: 'freehand' as PlotFeatureType,
      name: '实地手绘轨迹 (自由线)',
      desc: '外业踏勘自由手写绘制轨迹',
      icon: Pencil,
      badge: '手绘',
    },
  ];

  // 2. 专题地物与外业调查标号 (点要素扩展)
  const surveyPoints = [
    {
      type: 'point-survey' as PlotFeatureType,
      name: '控制测量与核查点',
      desc: '三等/四等导线点、外业调查标定',
      icon: Crosshair,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      type: 'point-station' as PlotFeatureType,
      name: '生态环境监测站',
      desc: '水质、气象、水文自动化站位',
      icon: Radio,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      type: 'point-facility' as PlotFeatureType,
      name: '市政基础设施点',
      desc: '公共建筑、泵站、变电所等设施',
      icon: Building2,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    },
    {
      type: 'point-hazard' as PlotFeatureType,
      name: '地灾与风险隐患点',
      desc: '边坡滑坡、水浸隐患重点监测点',
      icon: Flame,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      type: 'point-medical' as PlotFeatureType,
      name: '应急医疗与避难所',
      desc: '防灾应急避难中心、救援保障站',
      icon: HeartPulse,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  ];

  // 3. 规划趋势与态势标绘 (方向与区域)
  const directionalPlotting = [
    {
      type: 'attack-arrow' as PlotFeatureType,
      name: '空间发展推进轴',
      desc: '城镇拓展带、工程主攻推进宽轴',
      icon: Navigation,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
    {
      type: 'straight-arrow' as PlotFeatureType,
      name: '规划导向直箭头',
      desc: '交通流向、单向引导指示',
      icon: Compass,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      type: 'gathering-place' as PlotFeatureType,
      name: '重点管控集结地域',
      desc: '平滑曲线拟合闭合核心保护区',
      icon: Sparkles,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      type: 'sector' as PlotFeatureType,
      name: '监测覆盖扇形区',
      desc: '雷达监测、传感器有效视界扇面',
      icon: Radio,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      type: 'pincer-arrow' as PlotFeatureType,
      name: '双向分流与汇聚标绘',
      desc: '多路客流/物流汇聚与分流引导',
      icon: Crosshair,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
  ];

  const handlePick = (type: PlotFeatureType) => {
    onSelectTool(type);
    onClose();
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="GIS 空间标绘工具箱"
      icon={<PenTool className="w-4 h-4" />}
    >
      <div className="space-y-4">
        {/* 当前图层提示 */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs">
          <span className="text-gray-400">新建要素将保存至图层:</span>
          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: activeLayerColor }}
            />
            <span className="font-semibold text-white truncate max-w-[140px]">
              {activeLayerName}
            </span>
          </div>
        </div>

        {/* GIS 分类切换栏 */}
        <div className="flex p-1 bg-gray-950 rounded-xl border border-gray-800 text-xs">
          <button
            onClick={() => setActiveCategory('shapes')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              activeCategory === 'shapes'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            基础空间几何
          </button>
          <button
            onClick={() => setActiveCategory('points')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              activeCategory === 'points'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            专题调查点位
          </button>
          <button
            onClick={() => setActiveCategory('arrows')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              activeCategory === 'arrows'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            规划方向与态势
          </button>
        </div>

        {/* 标绘工具网格 */}
        <div className="grid grid-cols-2 gap-2.5">
          {activeCategory === 'shapes' &&
            basicShapes.map((item) => {
              const Icon = item.icon;
              const isSelected = currentDrawingTool === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handlePick(item.type)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500'
                      : 'border-gray-800 bg-gray-950/70 active:bg-gray-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-800 bg-gray-900 text-blue-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-100">{item.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}

          {activeCategory === 'points' &&
            surveyPoints.map((item) => {
              const Icon = item.icon;
              const isSelected = currentDrawingTool === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handlePick(item.type)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500'
                      : 'border-gray-800 bg-gray-950/70 active:bg-gray-800/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2 ${item.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-100">{item.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}

          {activeCategory === 'arrows' &&
            directionalPlotting.map((item) => {
              const Icon = item.icon;
              const isSelected = currentDrawingTool === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handlePick(item.type)}
                  className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-500/15 ring-2 ring-cyan-500'
                      : 'border-gray-800 bg-gray-950/70 active:bg-gray-800/60'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-2 ${item.color}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-100">{item.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5 truncate">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
    </MobileBottomSheet>
  );
};
