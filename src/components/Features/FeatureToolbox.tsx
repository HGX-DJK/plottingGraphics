import React from 'react';
import { PlotFeatureType } from '../../types';
import {
  Compass,
  Milestone,
  Type,
  Activity,
  Hexagon,
  Square,
  Circle,
  Pencil,
  Navigation,
  ShieldAlert,
  Flame,
  HeartPulse,
  Radio,
  Plane,
  Boxes,
  Crosshair,
  Sparkles,
} from 'lucide-react';

interface FeatureToolboxProps {
  currentDrawingTool: PlotFeatureType | null;
  onSelectDrawingTool: (tool: PlotFeatureType | null) => void;
  activeLayerName: string;
  activeLayerColor: string;
}

export const FeatureToolbox: React.FC<FeatureToolboxProps> = ({
  currentDrawingTool,
  onSelectDrawingTool,
  activeLayerName,
  activeLayerColor,
}) => {
  const tacticalSymbols = [
    {
      type: 'attack-arrow' as PlotFeatureType,
      name: '突击进攻箭头',
      desc: '3点标定主力突击方向与进攻轴线',
      icon: Navigation,
      color: 'text-red-400',
    },
    {
      type: 'pincer-arrow' as PlotFeatureType,
      name: '钳击双箭头',
      desc: '左右两路钳形夹击包围态势',
      icon: Crosshair,
      color: 'text-amber-400',
    },
    {
      type: 'straight-arrow' as PlotFeatureType,
      name: '进攻直箭头',
      desc: '2点标定单向进攻指示箭头',
      icon: Compass,
      color: 'text-orange-400',
    },
    {
      type: 'gathering-place' as PlotFeatureType,
      name: '战役集结地域',
      desc: '3点平滑拟合部队展开集结封闭圈',
      icon: Sparkles,
      color: 'text-rose-400',
    },
    {
      type: 'sector' as PlotFeatureType,
      name: '预警警戒扇形',
      desc: '圆心+方向标定雷达预警扇形面',
      icon: Radio,
      color: 'text-sky-400',
    },
  ];

  const tacticalPosts = [
    {
      type: 'post-command' as PlotFeatureType,
      name: '作战指挥所',
      desc: '基本指挥所/前进指挥所',
      icon: Milestone,
      color: 'text-red-500',
    },
    {
      type: 'post-radar' as PlotFeatureType,
      name: '雷达探测站',
      desc: '预警侦测与对空对海阵地',
      icon: Radio,
      color: 'text-blue-400',
    },
    {
      type: 'post-danger' as PlotFeatureType,
      name: '威胁障碍区',
      desc: '雷区/生化/敌方封锁危险源',
      icon: Flame,
      color: 'text-amber-400',
    },
    {
      type: 'post-rescue' as PlotFeatureType,
      name: '野战医疗站',
      desc: '伤员急救与综合保障',
      icon: HeartPulse,
      color: 'text-emerald-400',
    },
    {
      type: 'post-airport' as PlotFeatureType,
      name: '战备机场',
      desc: '航空兵力与无人机起降坪',
      icon: Plane,
      color: 'text-cyan-400',
    },
    {
      type: 'post-depot' as PlotFeatureType,
      name: '物资储备库',
      desc: '弹药、燃料与装备维修基地',
      icon: Boxes,
      color: 'text-purple-400',
    },
  ];

  const basicShapes = [
    {
      type: 'marker' as PlotFeatureType,
      name: '战术标记点',
      desc: '常规坐标图钉点',
      icon: Milestone,
    },
    {
      type: 'text' as PlotFeatureType,
      name: '文字注记',
      desc: '地图直接显示态势文字说明',
      icon: Type,
    },
    {
      type: 'polyline' as PlotFeatureType,
      name: '机动路线 (折线)',
      desc: '行军路线、补给通道与防线',
      icon: Activity,
    },
    {
      type: 'polygon' as PlotFeatureType,
      name: '控制地域 (多边形)',
      desc: '阵地控制区、封控防区',
      icon: Hexagon,
    },
    {
      type: 'rectangle' as PlotFeatureType,
      name: '网格搜索区 (矩形)',
      desc: '侦察搜索与任务空域框',
      icon: Square,
    },
    {
      type: 'circle' as PlotFeatureType,
      name: '警戒半径 (圆形)',
      desc: '有效杀伤、信号覆盖与防御圈',
      icon: Circle,
    },
    {
      type: 'freehand' as PlotFeatureType,
      name: '态势手绘线',
      desc: '草图手绘路径与线索',
      icon: Pencil,
    },
  ];

  const handleToolClick = (toolType: PlotFeatureType) => {
    if (currentDrawingTool === toolType) {
      onSelectDrawingTool(null);
    } else {
      onSelectDrawingTool(toolType);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 text-gray-200 select-none overflow-y-auto">
      {/* 顶部当前活动图层提示 */}
      <div className="p-3 bg-gray-950 border-b border-gray-800">
        <div className="text-[11px] text-gray-400">新建要素将自动落入当前工作图层:</div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: activeLayerColor }}
          />
          <span className="text-xs font-semibold text-white truncate">
            {activeLayerName}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 1. 战术态势军标 */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4" />
              <span>态势战术军标</span>
            </h3>
            <span className="text-[10px] text-gray-500">经典战役标号</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {tacticalSymbols.map((item) => {
              const Icon = item.icon;
              const isSelected = currentDrawingTool === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handleToolClick(item.type)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/15 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500'
                      : 'border-gray-800 hover:border-gray-700 bg-gray-950/70 hover:bg-gray-800/50'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg bg-gray-900 border border-gray-800 ${item.color} shrink-0`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-gray-100 flex items-center justify-between">
                      <span>{item.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500 text-gray-950 font-bold animate-pulse">
                          标绘中
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-400 truncate mt-0.5">
                      {item.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. 战术标号点位 */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>战术点位标号</span>
            </h3>
            <span className="text-[10px] text-gray-500">点击地图落点</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {tacticalPosts.map((item) => {
              const Icon = item.icon;
              const isSelected = currentDrawingTool === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handleToolClick(item.type)}
                  className={`flex flex-col p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-500/15 shadow-md ring-1 ring-blue-500'
                      : 'border-gray-800 hover:border-gray-700 bg-gray-950/70 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <div
                      className={`p-1.5 rounded-lg bg-gray-900 border border-gray-800 ${item.color}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-200 truncate">
                    {item.name}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate mt-0.5">
                    {item.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 基础矢量几何 */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Hexagon className="w-4 h-4" />
              <span>基础几何矢量</span>
            </h3>
            <span className="text-[10px] text-gray-500">点/线/面/圆</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {basicShapes.map((item) => {
              const Icon = item.icon;
              const isSelected = currentDrawingTool === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => handleToolClick(item.type)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-md ring-1 ring-emerald-500'
                      : 'border-gray-800 hover:border-gray-700 bg-gray-950/70 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-300 shrink-0">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-medium text-gray-200 truncate">
                    {item.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
