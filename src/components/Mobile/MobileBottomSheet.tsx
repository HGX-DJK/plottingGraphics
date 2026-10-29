import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockBodyScroll, trapFocus } from '../../utils/uiUtils';

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
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  // 下拉拖拽位移（px）与手势状态
  const dragOffsetRef = useRef(0);
  const dragStartYRef = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const isDraggingRef = useRef(false);

  // 关闭动画：先播放离场过渡，再真正卸载，避免抽屉「瞬间消失」
  const requestClose = React.useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // 滚动锁 + 焦点陷阱 + Esc 关闭
  useEffect(() => {
    if (!isOpen) return;

    const releaseLock = lockBodyScroll();
    const releaseFocus = trapFocus(panelRef.current);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseFocus();
      releaseLock();
    };
  }, [isOpen, requestClose]);

  // 关闭后重置手势状态
  useEffect(() => {
    if (!isOpen) {
      dragOffsetRef.current = 0;
      dragStartYRef.current = null;
      isDraggingRef.current = false;
      setDragOffset(0);
    }
  }, [isOpen]);

  // 下拉拖拽手势：向下拖动超过阈值即关闭抽屉
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isClosing) return;
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    dragOffsetRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;

    const delta = e.clientY - dragStartYRef.current;
    // 仅允许向下拖动，向上拖动做阻尼回弹
    const next = delta > 0 ? delta : delta * 0.25;
    dragOffsetRef.current = next;
    setDragOffset(next);
  };

  const handlePointerUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    dragStartYRef.current = null;

    const offset = dragOffsetRef.current;
    dragOffsetRef.current = 0;
    setDragOffset(0);

    // 拖过阈值或快速下滑即视为关闭意图
    if (offset > 110) {
      requestClose();
    }
  };

  if (!isOpen) return null;

  const sheetNode = (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end pointer-events-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 半透明暗黑遮罩 */}
      <div
        onClick={requestClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity ${
          isClosing ? 'gp-backdrop-exit' : 'animate-in fade-in duration-200'
        }`}
      />

      {/* 底部滑出抽屉 (浅色纯白，暗色极夜深灰，完美自适应) */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full ${heightClass} bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10 safe-bottom text-slate-800 dark:text-gray-100 transition-colors duration-200 ${
          isClosing
            ? 'gp-sheet-exit'
            : 'animate-in slide-in-from-bottom-full duration-250 ease-out'
        }`}
        style={{
          transform: dragOffset ? `translateY(${dragOffset}px)` : undefined,
          transition: isDraggingRef.current ? 'none' : 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* 顶部下拉手柄 (支持向下拖拽关闭) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full flex justify-center pt-2.5 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-gray-700/80 rounded-full" />
        </div>

        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200/90 dark:border-gray-800/80 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon && <span className="text-blue-600 dark:text-blue-400 shrink-0">{icon}</span>}
            <h3 className="text-sm font-bold tracking-wide text-slate-900 dark:text-white truncate">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              onClick={requestClose}
              className="p-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 内容区域 (可滚动) */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 text-slate-800 dark:text-slate-100">
          {children}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(sheetNode, document.body) : sheetNode;
};
