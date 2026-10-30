import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, HelpCircle } from 'lucide-react';
import { lockBodyScroll, trapFocus, setBackgroundInert } from '../../utils/uiUtils';

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  type = 'danger',
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // onClose 可能由父组件传入内联函数，这里用 ref 固定引用，
  // 避免 effect 因依赖变化反复重挂（会打断焦点陷阱与背景隔离）。
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const releaseLock = lockBodyScroll();
    const releaseFocus = trapFocus(panelRef.current);
    const releaseInert = setBackgroundInert(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 顺序要求：先归还焦点给触发元素，再解除背景 inert
      releaseFocus();
      releaseInert();
      releaseLock();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalNode = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150 select-none pointer-events-auto"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="gp-confirm-title"
        aria-describedby="gp-confirm-message"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
        className="w-full max-w-[320px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col items-center text-center animate-in zoom-in-95 duration-150 my-auto transition-colors duration-200"
      >
        {/* 顶部醒目图标 */}
        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-inner shrink-0 ${
            type === 'danger'
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400'
              : type === 'warning'
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-400'
              : 'bg-blue-500/15 border border-blue-500/30 text-blue-500 dark:text-blue-400'
          }`}
        >
          {type === 'danger' ? (
            <Trash2 className="w-5 h-5 stroke-[2.2]" />
          ) : type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          ) : (
            <HelpCircle className="w-5 h-5 stroke-[2.2]" />
          )}
        </div>

        {/* 标题 */}
        <h3
          id="gp-confirm-title"
          className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1.5 shrink-0"
        >
          {title || (type === 'danger' ? '确认删除' : '操作确认')}
        </h3>

        {/* 提示内容 */}
        <p
          id="gp-confirm-message"
          className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5 px-1 break-words"
        >
          {message}
        </p>

        {/* 底部中文操作按钮组 (彻底替代原生 CANCEL 与 OK，确保永远完整展示) */}
        <div className="flex items-center gap-3 w-full shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-700 dark:text-slate-300 font-bold text-xs transition border border-slate-200 dark:border-slate-700/60 shadow-sm"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg transition active:scale-[0.98] ${
              type === 'danger'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/30'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};
