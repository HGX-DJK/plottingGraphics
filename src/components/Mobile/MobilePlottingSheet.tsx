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
  Plane,
  Boxes,
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
  const [activeCategory, setActiveCategory] = useState<'tactical' | 'posts' | 'shapes'>('tactical');

  const tacticalSymbols = [
    {
      type: 'attack-arrow' as PlotFeatureType,
      name: '突击进攻箭头',
      desc: '主力突击方向 (3点确定)',
      icon: Navigation,
      color: 'text-red-400 bg-red-500/10 border-red-500/30',
    },
    {
      type: 'pincer-arrow' as PlotFeatureType,
      name: '钳击双箭头',
      desc: '左右钳形合围 (3点确定)',
      icon: Crosshair,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      type: 'straight-arrow' as PlotFeatureType,
      name: '进攻直箭头',
      desc: '进攻指向指示 (2点确定)',
      icon: Compass,
      color: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    },
    {
      type: 'gathering-place' as PlotFeatureType,
      name: '战役集结地域',
      desc: '兵力集结封闭区 (3点确定)',
      icon: Sparkles,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      type: 'sector' as PlotFeatureType,
      name: '预警防御扇形',
      desc: '雷达防空探测面 (2点确定)',
      icon: Radio,
      color: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
    },
  ];

  const tacticalPosts = [
    {
      type: 'post-command' as PlotFeatureType,
      name: '作战指挥所',
      desc: '指挥前进/基本指',
      icon: Milestone,
      color: 'text-red-500 bg-red-500/10 border-red-500/30',
    },
    {
      type: 'post-radar' as PlotFeatureType,
      name: '雷达探测站',
      desc: '对空对海预警',
      icon: Radio,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    },
    {
      type: 'post-danger' as PlotFeatureType,
      name: '威胁障碍区',
      desc: '雷区/敌封锁区',
      icon: Flame,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      type: 'post-rescue' as PlotFeatureType,
      name: '野战医疗站',
      desc: '急救与伤员后送',
      icon: HeartPulse,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    {
      type: 'post-airport' as PlotFeatureType,
      name: '战备机场',
      desc: '战机/无人机起降',
      icon: Plane,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      type: 'post-depot' as PlotFeatureType,
      name: '军备物资库',
      desc: '弹药油料补给基地',
      icon: Boxes,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
  ];

  const basicShapes = [
    {
      type: 'marker' as PlotFeatureType,
      name: '战术标记点',
      desc: '单点坐标图钉',
      icon: Milestone,
    },
    {
      type: 'text' as PlotFeatureType,
      name: '文字注记',
      desc: '地图说明标签',
      icon: Type,
    },
    {
      type: 'polyline' as PlotFeatureType,
      name: '机动路线 (折线)',
      desc: '行军路线双击完成',
      icon: Activity,
    },
    {
      type: 'polygon' as PlotFeatureType,
      name: '控制地域 (多边形)',
      desc: '封闭防区双击完成',
      icon: Hexagon,
    },
    {
      type: 'rectangle' as PlotFeatureType,
      name: '搜索网格 (矩形)',
      desc: '2点标定区域框',
      icon: Square,
    },
    {
      type: 'circle' as PlotFeatureType,
      name: '警戒半径 (圆形)',
      desc: '中心点+半径',
      icon: Circle,
    },
    {
      type: 'freehand' as PlotFeatureType,
      name: '态势自由手绘',
      desc: '屏幕触控手绘轨迹',
      icon: Pencil,
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
      title="标绘工具箱"
      icon={<PenTool className="w-4 h-4" />}
    >
      <div className="space-y-4">
        {/* 当前图层提示 */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950 border border-gray-800 text-xs">
          <span className="text-gray-400">要素将落入工作图层:</span>
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

        {/* 分类切换器 */}
        <div className="flex p-1 bg-gray-950 rounded-xl border border-gray-800 text-xs">
          <button
            onClick={() => setActiveCategory('tactical')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              activeCategory === 'tactical'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            态势军标
          </button>
          <button
            onClick={() => setActiveCategory('posts')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              activeCategory === 'posts'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            战术标号
          </button>
          <button
            onClick={() => setActiveCategory('shapes')}
            className={`flex-1 py-2 rounded-lg font-medium transition ${
              activeCategory === 'shapes'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            基础矢量
          </button>
        </div>

        {/* 标绘列表 */}
        <div className="grid grid-cols-2 gap-2.5">
          {activeCategory === 'tactical' &&
            tacticalSymbols.map((item) => {
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

          {activeCategory === 'posts' &&
            tacticalPosts.map((item) => {
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
                      ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500'
                      : 'border-gray-800 bg-gray-950/70 active:bg-gray-800/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-gray-800 bg-gray-900 text-gray-300 mb-2">
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
