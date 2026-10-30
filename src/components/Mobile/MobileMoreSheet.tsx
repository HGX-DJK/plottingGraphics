import React, { useState } from 'react';
import { User, BasemapType } from '../../types';
import { ThemeMode } from '../../services/themeService';
import {
  MoreHorizontal,
  Globe2,
  FolderInput,
  RefreshCw,
  LogOut,
  Download,
  Upload,
  ShieldCheck,
  Sun,
  Moon,
  SunMedium,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { ConfirmModal } from '../Modals/ConfirmModal';

interface MobileMoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  basemap: BasemapType;
  onChangeBasemap: (mapType: BasemapType) => void;
  onOpenImportExport: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
  theme?: ThemeMode;
  onSelectTheme?: (theme: ThemeMode) => void;
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
  theme = 'dark',
  onSelectTheme,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const basemaps: { id: BasemapType; label: string; desc: string }[] = [
    { id: 'dark', label: '暗夜科技', desc: 'Esri 极夜深灰底图，高对比度护眼' },
    { id: 'satellite', label: '卫星遥感', desc: 'ArcGIS 高清全球正射遥感影像' },
    { id: 'street', label: '现代街道', desc: 'Esri 高清街道图，全路网与地标' },
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
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">{currentUser?.avatar || '👤'}</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5 min-w-0">
                <span className="truncate">{currentUser?.displayName}</span>
              </div>
              <div className="text-[11px] text-blue-600 dark:text-blue-300/80 mt-0.5 truncate">
                {currentUser?.roleName}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 font-medium active:scale-95 transition shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>退出</span>
          </button>
        </div>

        {/* 系统明暗主题风格切换 */}
        <div>
          <label className="block text-slate-600 dark:text-gray-400 font-semibold mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <SunMedium className="w-3.5 h-3.5 text-amber-500" />
              <span>界面明暗外观风格</span>
            </span>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 font-normal">全系统实时响应</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSelectTheme?.('dark')}
              aria-pressed={theme === 'dark'}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 shadow ring-1 ring-blue-500 text-blue-700 dark:text-white'
                  : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              <Moon className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs">极夜暗色 (Dark)</div>
                <div className="text-[10px] text-slate-400 dark:text-gray-500 truncate mt-0.5">科技感夜间护眼</div>
              </div>
            </button>

            <button
              onClick={() => onSelectTheme?.('light')}
              aria-pressed={theme === 'light'}
              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition text-left ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 shadow ring-1 ring-blue-500 text-blue-700 dark:text-white'
                  : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
              }`}
            >
              <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
              <div className="min-w-0">
                <div className="font-bold text-xs">清新浅色 (Light)</div>
                <div className="text-[10px] text-slate-400 dark:text-gray-500 truncate mt-0.5">户外强光高对比</div>
              </div>
            </button>
          </div>
        </div>

        {/* 底图选择 */}
        <div>
          <label className="block text-slate-600 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
            <Globe2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>选择底图图源</span>
          </label>
          <div className="grid grid-cols-3 gap-2 items-stretch">
            {basemaps.map((b) => (
              <button
                key={b.id}
                onClick={() => onChangeBasemap(b.id)}
                aria-pressed={basemap === b.id}
                className={`p-2.5 rounded-xl border text-left transition active:scale-[0.97] min-w-0 ${
                  basemap === b.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 shadow ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 hover:bg-slate-100 dark:hover:bg-gray-900'
                }`}
              >
                <div className="font-bold text-slate-800 dark:text-gray-200 truncate">
                  {b.label}
                </div>
                {/* 窄屏下限制描述为两行，避免卡片高度参差与文字溢出 */}
                <div className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5 leading-tight line-clamp-2 break-words min-h-[2.4em]">
                  {b.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 数据导入与导出 */}
        <div>
          <label className="block text-slate-600 dark:text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
            <FolderInput className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>标绘工程数据</span>
          </label>
          <button
            onClick={() => {
              onClose();
              onOpenImportExport();
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 active:bg-slate-100 dark:active:bg-gray-900 transition"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <div className="text-left">
                <div className="font-semibold text-slate-800 dark:text-gray-200">工程备份与外部导入</div>
                <div className="text-[10px] text-slate-400 dark:text-gray-500">导出/导入 JSON、GeoJSON 格式</div>
              </div>
            </div>
            <span className="text-blue-600 dark:text-blue-400 font-medium">打开</span>
          </button>
        </div>

        {/* 恢复演示数据 */}
        <div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 active:bg-amber-50 dark:active:text-amber-300 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>重置为内置演训态势演示数据</span>
          </button>
        </div>

        <div className="pt-2 text-center text-[10px] text-slate-400 dark:text-gray-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>标绘系统</span>
        </div>
      </div>

      {/* 中文定制重置确认弹窗 */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          onResetDemo();
          onClose();
        }}
        title="恢复默认演练数据确认"
        message="确定恢复初始预置的图层与标绘要素吗？当前地图中的新增和修改将被重置。"
        confirmText="确定恢复"
        cancelText="取消"
        type="warning"
      />
    </MobileBottomSheet>
  );
};
