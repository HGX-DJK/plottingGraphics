import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { lockBodyScroll, trapFocus, setBackgroundInert } from '../../utils/uiUtils';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  heightClass?: string;
  headerAction?: React.ReactNode;
}

const MobileBottomSheetBase: React.FC<MobileBottomSheetProps> = ({
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
  // 拖拽位移更新的 rAF 句柄（用于合并同一帧内的多次 pointermove）
  const dragRafRef = useRef<number | null>(null);
  // 拖拽中状态用于关闭过渡动画，保证手势跟手无延迟
  const [isDragging, setIsDragging] = useState(false);

  // 关闭逻辑用 ref 稳定化，避免 requestClose 每次渲染变化导致下方 effect 反复重挂
  // （重挂会造成滚动锁与焦点陷阱在离场动画期间被释放又重新获取）
  const isClosingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 关闭动画：先播放离场过渡，再真正卸载，避免抽屉「瞬间消失」
  const closeTimerRef = useRef<number | null>(null);
  const requestClose = React.useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      isClosingRef.current = false;
      setIsClosing(false);
      onCloseRef.current();
    }, 220);
  }, []);

  // 卸载时清理关闭定时器与拖拽 rAF（抽屉已改为按需挂载，父级可能在其离场动画期间直接卸载）
  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (dragRafRef.current !== null) {
        cancelAnimationFrame(dragRafRef.current);
        dragRafRef.current = null;
      }
      // 兜底：确保拖拽状态一定被复位，不会残留 isDragging=true
      isDraggingRef.current = false;
      dragStartYRef.current = null;
    },
    []
  );

  // 滚动锁 + 焦点陷阱 + 背景隔离 + Esc 关闭
  useEffect(() => {
    if (!isOpen) return;

    const releaseLock = lockBodyScroll();
    // 聚焦抽屉容器本身，避免在某个按钮上留下突兀的焦点环
    const releaseFocus = trapFocus(panelRef.current, { focusFirst: false });
    const releaseInert = setBackgroundInert(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 顺序要求：先归还焦点给触发元素，再解除背景 inert，
      // 否则触发元素仍处于 inert 状态，focus 会被浏览器静默忽略。
      releaseFocus();
      releaseInert();
      releaseLock();
    };
  }, [isOpen, requestClose]);

  // 关闭后重置手势状态
  useEffect(() => {
    if (!isOpen) {
      dragOffsetRef.current = 0;
      dragStartYRef.current = null;
      isDraggingRef.current = false;
      setIsDragging(false);
      setDragOffset(0);
    }
  }, [isOpen]);

  /**
   * 下拉拖拽手势：向下拖动超过阈值即关闭抽屉
   *
   * 关键点：必须调用 setPointerCapture。
   * 手柄只有约 20px 高，鼠标/触控板下指针一旦移出手柄，
   * pointermove / pointerup 会被改派给手柄下方的元素，
   * 于是 handlePointerMove 冻结、handlePointerUp 永不执行，
   * isDragging 永远为 true → 面板 transition 被永久置为 none 且停在冻结的偏移位，
   * 拖拽关闭彻底失效（桌面「真机外框预览」模式下必现）。
   * 捕获指针后，所有后续事件都会继续派发给手柄本身。
   */
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isClosing) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      /* 少数环境不支持指针捕获，忽略即可 */
    }
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    dragOffsetRef.current = 0;
    // 立即关闭过渡动画，否则首次滑动会被 220ms 的过渡拖慢，破坏跟手感
    setIsDragging(true);
  };

  /**
   * 位移更新用 requestAnimationFrame 合并：
   * 原实现每个 pointermove 事件都 setState，触控板上每秒可达上百次。
   */
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || dragStartYRef.current === null) return;

    const delta = e.clientY - dragStartYRef.current;
    // 仅允许向下拖动，向上拖动做阻尼回弹
    const next = delta > 0 ? delta : delta * 0.25;
    dragOffsetRef.current = next;

    if (dragRafRef.current !== null) return;
    dragRafRef.current = requestAnimationFrame(() => {
      dragRafRef.current = null;
      setDragOffset(dragOffsetRef.current);
    });
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    if (!isDraggingRef.current) return;

    if (e) {
      try {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (err) {
        /* 忽略释放失败 */
      }
    }

    isDraggingRef.current = false;
    dragStartYRef.current = null;
    setIsDragging(false);

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
        tabIndex={-1}
        className={`relative w-full ${heightClass} bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden z-10 safe-bottom text-slate-800 dark:text-gray-100 transition-colors duration-200 focus:outline-none ${
          isClosing
            ? 'gp-sheet-exit'
            : 'animate-in slide-in-from-bottom-full duration-250 ease-out'
        }`}
        style={{
          transform: `translateY(${dragOffset}px)`,
          // 拖拽期间禁用过渡以保证跟手；松手后恢复位移与配色的平滑过渡
          transition: isDragging
            ? 'none'
            : 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms, background-color 200ms, border-color 200ms',
        }}
      >
        {/* 顶部下拉手柄 (支持向下拖拽关闭) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          // 指针捕获意外丢失时同样要走收尾流程，确保 isDragging 一定复位
          onLostPointerCapture={handlePointerUp}
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
              // after 伪元素向外扩展 8px 的可点击区域，把图标按钮的触控热区
              // 从 28px 提升到 44px（移动端可点击目标下限），且不影响原有排版
              className="relative p-1.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition after:absolute after:inset-0 after:-m-2 after:content-['']"
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

/**
 * 记忆化包装：上层组件的无关状态变化（如视口中心、缩放级别刷新）
 * 不再触发本组件整体重渲染，避免移动端无谓的整树 diff 开销。
 */
export const MobileBottomSheet = React.memo(MobileBottomSheetBase);
