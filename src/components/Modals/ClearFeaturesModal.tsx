import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, X, RefreshCw, Layers, ShieldAlert } from 'lucide-react';

interface ClearFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLayerName: string;
  activeLayerColor: string;
  activeLayerFeatureCount: number;
  totalFeatureCount: number;
  onClearActiveLayer: () => void;
  onClearAllFeatures: () => void;
  onResetDemo: () => void;
}

export const ClearFeaturesModal: React.FC<ClearFeaturesModalProps> = ({
  isOpen,
  onClose,
  activeLayerName,
  activeLayerColor,
  activeLayerFeatureCount,
  totalFeatureCount,
  onClearActiveLayer,
  onClearAllFeatures,
  onResetDemo,
}) => {
  if (!isOpen) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200 pointer-events-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 mb-2 sm:mb-0">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/60">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-500/15 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100">清除地图要素</h3>
              <p className="text-[10px] text-slate-500 dark:text-gray-400">当前地图收录 {totalFeatureCount} 个标绘图元</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容与选项按钮 */}
        <div className="p-5 space-y-3">
          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex items-start gap-2.5 text-amber-800 dark:text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed text-[11px]">
              清除后图元将被移出地图，请确认需要清除的要素图层范围。
            </span>
          </div>

          {/* 选项 1：仅清空当前工作图层 */}
          <button
            type="button"
            disabled={activeLayerFeatureCount === 0}
            onClick={() => {
              onClearActiveLayer();
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950/80 hover:bg-slate-100 dark:hover:bg-gray-800/80 active:scale-[0.98] text-left transition flex items-center justify-between group disabled:opacity-40 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: activeLayerColor }}
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 dark:text-gray-200 group-hover:text-slate-900 dark:group-hover:text-white truncate">
                  清空当前工作图层
                </div>
                <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                  「{activeLayerName}」包含 {activeLayerFeatureCount} 个要素
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-gray-800 text-slate-700 dark:text-gray-300 font-mono font-bold">
              {activeLayerFeatureCount}
            </span>
          </button>

          {/* 选项 2：清空全地图所有要素 */}
          <button
            type="button"
            disabled={totalFeatureCount === 0}
            onClick={() => {
              onClearAllFeatures();
              onClose();
            }}
            className="w-full p-3.5 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/40 active:scale-[0.98] text-left transition flex items-center justify-between group disabled:opacity-40 disabled:pointer-events-none"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-3 h-3 rounded-full bg-red-500/80 shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-red-700 dark:text-red-300 group-hover:text-red-800 dark:group-hover:text-red-200 truncate">
                  清空全地图所有要素
                </div>
                <div className="text-[10px] text-red-600/80 dark:text-red-400/80 truncate mt-0.5">
                  清除所有图层全部标绘（共 {totalFeatureCount} 个）
                </div>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 font-mono font-bold">
              全部
            </span>
          </button>

          {/* 选项 3：恢复默认初始演示数据 */}
          <button
            type="button"
            onClick={() => {
              onResetDemo();
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl border border-slate-200 dark:border-gray-800/80 hover:bg-slate-100 dark:hover:bg-gray-800/60 text-xs text-slate-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-300 flex items-center justify-center gap-2 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>重置为初始规划演示数据</span>
          </button>
        </div>

        {/* 底部取消按钮 */}
        <div className="p-3 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white transition"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
