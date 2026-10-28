import React from 'react';
import { User, BasemapType } from '../../types';
import {
  MoreHorizontal,
  Globe2,
  FolderInput,
  RefreshCw,
  LogOut,
  Download,
  Upload,
  ShieldCheck,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  basemap: BasemapType;
  onChangeBasemap: (mapType: BasemapType) => void;
  onOpenImportExport: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
}

export const MobileMoreSheet: React.FC<MobileMoreSheetProps> = ({
  isOpen,
  onClose,
  currentUser,
  basemap,
  onChangeBasemap,
  onOpenImportExport,
  onResetDemo,
  onLogout,
}) => {
  const basemaps: { id: BasemapType; label: string; desc: string }[] = [
    { id: 'dark', label: '暗夜科技', desc: 'Carto Dark 态势高对比' },
    { id: 'satellite', label: '卫星遥感', desc: 'ArcGIS 高清卫星影像' },
    { id: 'street', label: '现代街道', desc: 'Carto Voyager 详细路网' },
    { id: 'grid', label: '态势网格', desc: '战役推演仿真坐标底板' },
  ];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="控制中心与设置"
      icon={<MoreHorizontal className="w-4 h-4" />}
    >
      <div className="space-y-4 pb-4 text-xs">
        {/* 用户信息卡片 */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentUser?.avatar || '👤'}</span>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{currentUser?.displayName}</span>
              </div>
              <div className="text-[11px] text-blue-300/80 mt-0.5">
                {currentUser?.roleName}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 font-medium active:bg-red-900/40 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>

        {/* 底图选择 */}
        <div>
          <label className="block text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>选择底图图源</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {basemaps.map((b) => (
              <button
                key={b.id}
                onClick={() => onChangeBasemap(b.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  basemap === b.id
                    ? 'border-blue-500 bg-blue-500/15 shadow ring-1 ring-blue-500'
                    : 'border-gray-800 bg-gray-950 hover:bg-gray-850'
                }`}
              >
                <div className="font-bold text-gray-200">{b.label}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 数据导入与导出 */}
        <div>
          <label className="block text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
            <FolderInput className="w-3.5 h-3.5 text-purple-400" />
            <span>标绘工程数据</span>
          </label>
          <button
            onClick={() => {
              onClose();
              onOpenImportExport();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-950 border border-gray-800 active:bg-gray-800 transition"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-purple-400" />
              <div className="text-left">
                <div className="font-semibold text-gray-200">工程备份与外部导入</div>
                <div className="text-[10px] text-gray-500">导出/导入 JSON、GeoJSON 格式</div>
              </div>
            </div>
            <span className="text-blue-400 font-medium">打开</span>
          </button>
        </div>

        {/* 恢复演示数据 */}
        <div>
          <button
            onClick={() => {
              if (window.confirm('确定恢复初始演训态势数据吗？')) {
                onResetDemo();
                onClose();
              }
            }}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gray-950 border border-gray-800 text-gray-400 active:text-amber-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span>重置为内置演训态势演示数据</span>
          </button>
        </div>

        <div className="pt-2 text-center text-[10px] text-gray-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>GeoPlot Studio Mobile App • MapTalks GL</span>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
