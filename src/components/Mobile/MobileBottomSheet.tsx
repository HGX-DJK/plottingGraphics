import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  heightClass?: string;
  headerAction?: React.ReactNode;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  heightClass = 'max-h-[82vh]',
  headerAction,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* 半透明暗黑遮罩 */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* 底部滑出抽屉 */}
      <div
        className={`relative w-full ${heightClass} bg-gray-900 border-t border-gray-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10 safe-bottom animate-in slide-in-from-bottom-full duration-250 ease-out`}
      >
        {/* 顶部下拉手柄 */}
        <div className="w-full flex justify-center pt-2.5 pb-1">
          <div className="w-12 h-1.5 bg-gray-700/80 rounded-full" />
        </div>

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800/80 shrink-0">
          <div className="flex items-center gap-2.5">
            {icon && <span className="text-blue-400">{icon}</span>}
            <h3 className="text-sm font-bold tracking-wide text-white">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            {headerAction}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white transition"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容区域 (可滚动) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {children}
        </div>
      </div>
    </div>
  );
};
