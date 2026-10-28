import React, { useState } from 'react';
import { User, PlotLayer, BasemapType, PlotFeatureType } from '../../types';
import {
  Layers,
  Map as MapIcon,
  Ruler,
  FolderInput,
  LogOut,
  ChevronDown,
  Activity,
  Globe2,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  layers: PlotLayer[];
  activeLayerId: string;
  basemap: BasemapType;
  drawingTool: PlotFeatureType | 'measure-distance' | 'measure-area' | null;
  onSelectActiveLayer: (layerId: string) => void;
  onChangeBasemap: (mapType: BasemapType) => void;
  onToggleMeasure: () => void;
  onOpenImportExport: () => void;
  onLogout: () => void;
  onOpenNewLayerModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  layers,
  activeLayerId,
  basemap,
  drawingTool,
  onSelectActiveLayer,
  onChangeBasemap,
  onToggleMeasure,
  onOpenImportExport,
  onLogout,
  onOpenNewLayerModal,
}) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  const basemapOptions: { id: BasemapType; label: string }[] = [
    { id: 'dark', label: '暗色矢量' },
    { id: 'satellite', label: '高清遥感卫星' },
    { id: 'street', label: '现代街道' },
    { id: 'grid', label: '极简底板' },
  ];

  return (
    <header className="h-14 bg-gray-900/90 backdrop-blur-md border-b border-gray-800 px-4 flex items-center justify-between text-gray-200 select-none z-40 relative">
      {/* 左侧：Logo & 系统名称 */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shadow-inner">
          <Activity className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold tracking-wide text-white">
              GeoPlot Studio
            </h1>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 font-medium border border-blue-500/30">
              MapTalks GL 态势标绘
            </span>
          </div>
          <p className="text-[10px] text-gray-400 -mt-0.5">
            图层分层管控 • 战术军标标绘 • 纯前端协同
          </p>
        </div>
      </div>

      {/* 中间核心操作区：当前工作图层快捷选择、底图切换、量算 */}
      <div className="flex items-center gap-3">
        {/* 当前工作图层快捷切换 */}
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-950/80 border border-gray-800 rounded-lg text-xs">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-gray-400">当前图层:</span>
          <select
            value={activeLayerId}
            onChange={(e) => onSelectActiveLayer(e.target.value)}
            className="bg-transparent text-gray-100 font-medium focus:outline-none cursor-pointer"
          >
            {layers.map((l) => (
              <option key={l.id} value={l.id} className="bg-gray-900 text-gray-100">
                {l.name}
              </option>
            ))}
          </select>
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: activeLayer?.color || '#3b82f6' }}
          />
        </div>

        {/* 底图切换下拉 */}
        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-950/80 border border-gray-800 rounded-lg text-xs">
          <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
          <select
            value={basemap}
            onChange={(e) => onChangeBasemap(e.target.value as BasemapType)}
            className="bg-transparent text-gray-200 focus:outline-none cursor-pointer"
          >
            {basemapOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-gray-900 text-gray-100">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 距离量算工具 */}
        <button
          onClick={onToggleMeasure}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
            drawingTool === 'measure-distance'
              ? 'border-amber-500 bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50'
              : 'border-gray-800 bg-gray-950/80 hover:bg-gray-800 text-gray-300'
          }`}
          title="球面距离量算"
        >
          <Ruler className="w-3.5 h-3.5 text-amber-400" />
          <span>测距工具</span>
        </button>

        {/* 数据导入与导出 */}
        <button
          onClick={onOpenImportExport}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-950/80 hover:bg-gray-800 border border-gray-800 rounded-lg text-xs text-gray-300 transition"
          title="导出/导入标绘工程文件"
        >
          <FolderInput className="w-3.5 h-3.5 text-purple-400" />
          <span>工程备份</span>
        </button>
      </div>

      {/* 右侧：用户中心 & 登录/登出 */}
      <div className="flex items-center gap-3">
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-gray-950/80 hover:bg-gray-800 border border-gray-800 transition"
            >
              <span className="text-base">{currentUser.avatar}</span>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium text-gray-100 flex items-center gap-1">
                  <span>{currentUser.displayName}</span>
                  <span className="text-[10px] px-1 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    {currentUser.role}
                  </span>
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* 用户菜单下拉 */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-gray-800/80">
                  <div className="text-xs font-bold text-white">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {currentUser.roleName}
                  </div>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenNewLayerModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg transition"
                  >
                    新建标绘图层
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onOpenImportExport();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 rounded-lg transition"
                  >
                    导入/导出项目
                  </button>
                </div>

                <div className="pt-1 border-t border-gray-800/80">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>切换账号 / 退出登录</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <span className="text-xs text-gray-400">未登录</span>
        )}
      </div>
    </header>
  );
};
