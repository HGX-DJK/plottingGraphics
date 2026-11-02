import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Pipette, X } from 'lucide-react';
import {
  Rgb,
  Hsl,
  parseHex,
  formatHex,
  rgbToHsl,
  hslToRgb,
  normalizeHex,
  isDarkColor,
  GIS_COLOR_PRESETS,
} from '../../utils/colorUtils';
import { lockBodyScroll, trapFocus, setBackgroundInert } from '../../utils/uiUtils';

interface MobileColorPickerProps {
  isOpen: boolean;
  /** 标题，如「选择边框线条颜色」 */
  title: string;
  /** 当前颜色（任意 hex 写法，内部会规范化） */
  value: string;
  /** 确认选择 */
  onConfirm: (hex: string) => void;
  /** 取消 */
  onCancel: () => void;
}

/** 键盘调节步长（百分比） */
const KEY_STEP = 1;

const MobileColorPickerBase: React.FC<MobileColorPickerProps> = ({
  isOpen,
  title,
  value,
  onConfirm,
  onCancel,
}) => {
  // 当前选中的颜色（面板内实时预览，确认后才提交）
  const [draftHex, setDraftHex] = useState<string>(() => normalizeHex(value, '#3b82f6'));
  const [hsl, setHsl] = useState<Hsl>(() => {
    const rgb = parseHex(normalizeHex(value, '#3b82f6'));
    return rgb ? rgbToHsl(rgb) : { h: 217, s: 0.91, l: 0.6 };
  });
  // 十六进制文本输入（允许用户手输，允许中间态非法值）
  const [hexInput, setHexInput] = useState<string>(draftHex);

  const svPanelRef = useRef<HTMLDivElement>(null);
  const hueStripRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // 拖拽状态：用显式标志位而非 e.buttons 判定。
  // 触屏在部分 WebView 里 pointermove 的 buttons 恒为 0，会导致跟手失效。
  const svDraggingRef = useRef(false);
  const hueDraggingRef = useRef(false);

  // 打开时同步外部传入的颜色
  useEffect(() => {
    if (!isOpen) return;
    const normalized = normalizeHex(value, '#3b82f6');
    setDraftHex(normalized);
    setHexInput(normalized);
    const rgb = parseHex(normalized);
    if (rgb) setHsl(rgbToHsl(rgb));
    // 关闭期间可能残留拖拽标志，复位以免下次打开时"自动跟随"
    svDraggingRef.current = false;
    hueDraggingRef.current = false;
  }, [isOpen, value]);

  // 滚动锁 + 焦点陷阱 + 背景隔离 + Esc 关闭
  useEffect(() => {
    if (!isOpen) return;

    const releaseLock = lockBodyScroll();
    const releaseFocus = trapFocus(panelRef.current, { focusFirst: false });
    const releaseInert = setBackgroundInert(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      releaseFocus();
      releaseInert();
      releaseLock();
    };
  }, [isOpen, onCancel]);

  const applyHsl = useCallback((next: Hsl) => {
    setHsl(next);
    const hex = formatHex(hslToRgb(next));
    setDraftHex(hex);
    setHexInput(hex);
  }, []);

  /**
   * 在饱和度/明度面板上取色。
   *
   * 横轴 = 饱和度 0→1，纵轴 = 明度 1→0（上亮下暗，与主流取色器一致）。
   * 用 pointer 事件统一处理鼠标与触摸，配合 setPointerCapture 保证
   * 手指滑出面板后仍能连续跟手。
   */
  const handleSvPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const panel = svPanelRef.current;
      if (!panel) return;
      const rect = panel.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const sat = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const light = Math.min(1, Math.max(0, 1 - (e.clientY - rect.top) / rect.height));
      applyHsl({ ...hsl, s: sat, l: light });
    },
    [applyHsl, hsl]
  );

  const handleSvDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      svDraggingRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        /* 少数环境不支持指针捕获，忽略即可 */
      }
      handleSvPointer(e);
    },
    [handleSvPointer]
  );

  const handleSvMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // 仅在按住拖动时跟随
      if (!svDraggingRef.current) return;
      handleSvPointer(e);
    },
    [handleSvPointer]
  );

  const handleSvUp = useCallback(() => {
    svDraggingRef.current = false;
  }, []);

  /** 色相条取色 */
  const handleHuePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const strip = hueStripRef.current;
      if (!strip) return;
      const rect = strip.getBoundingClientRect();
      if (rect.width === 0) return;
      const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      applyHsl({ ...hsl, h: ratio * 360 });
    },
    [applyHsl, hsl]
  );

  const handleHueDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      hueDraggingRef.current = true;
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {
        /* 忽略 */
      }
      handleHuePointer(e);
    },
    [handleHuePointer]
  );

  const handleHueMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!hueDraggingRef.current) return;
      handleHuePointer(e);
    },
    [handleHuePointer]
  );

  const handleHueUp = useCallback(() => {
    hueDraggingRef.current = false;
  }, []);

  /**
   * 键盘调节：左右/上下方向键微调色相与饱和度明度。
   * role="slider" 的元素必须可聚焦且可键盘操作，否则读屏与键盘用户无法使用。
   */
  const handleSvKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = KEY_STEP / 100;
      let { s, l } = hsl;
      switch (e.key) {
        case 'ArrowLeft':
          s -= step;
          break;
        case 'ArrowRight':
          s += step;
          break;
        case 'ArrowUp':
          l += step;
          break;
        case 'ArrowDown':
          l -= step;
          break;
        case 'Home':
          s = 0;
          l = 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      applyHsl({
        ...hsl,
        s: Math.min(1, Math.max(0, s)),
        l: Math.min(1, Math.max(0, l)),
      });
    },
    [applyHsl, hsl]
  );

  const handleHueKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const step = (KEY_STEP * 360) / 100;
      let { h } = hsl;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          h -= step;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          h += step;
          break;
        case 'Home':
          h = 0;
          break;
        default:
          return;
      }
      e.preventDefault();
      applyHsl({ ...hsl, h: ((h % 360) + 360) % 360 });
    },
    [applyHsl, hsl]
  );

  /** 手输十六进制：合法则立即应用，非法则仅保留文本待用户继续修改 */
  const handleHexInput = (text: string) => {
    setHexInput(text);
    const parsed = parseHex(text);
    if (parsed) {
      const hex = formatHex(parsed);
      setDraftHex(hex);
      setHsl(rgbToHsl(parsed));
    }
  };

  const hexValid = parseHex(hexInput) !== null;

  // 当前颜色的 RGB 视图（用于面板底色与指针描边）
  const currentRgb = useMemo<Rgb>(() => {
    const parsed = parseHex(draftHex);
    return parsed || { r: 59, g: 130, b: 246 };
  }, [draftHex]);

  if (!isOpen) return null;

  const pickerNode = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 遮罩 */}
      <div
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative w-full max-w-sm bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 focus:outline-none"
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-gray-100 font-semibold text-sm">
            <Pipette className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{title}</span>
          </div>
          <button
            onClick={onCancel}
            className="relative p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition after:absolute after:inset-0 after:-m-2 after:content-['']"
            aria-label="关闭取色器"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* 当前颜色预览条 */}
          <div
            className="h-12 rounded-xl border border-slate-200 dark:border-gray-700 flex items-center justify-between px-3 transition-colors duration-150"
            style={{ backgroundColor: draftHex }}
          >
            <span
              className="font-mono text-xs font-bold px-2 py-1 rounded-lg bg-black/25 backdrop-blur-sm"
              style={{ color: isDarkColor(draftHex) ? '#ffffff' : '#0f172a' }}
            >
              {draftHex.toUpperCase()}
            </span>
            <span
              className="font-mono text-[10px] px-2 py-1 rounded-lg bg-black/25 backdrop-blur-sm"
              style={{ color: isDarkColor(draftHex) ? '#ffffff' : '#0f172a' }}
            >
              RGB {currentRgb.r}/{currentRgb.g}/{currentRgb.b}
            </span>
          </div>

          {/* 饱和度 / 明度面板 */}
          <div
            ref={svPanelRef}
            onPointerDown={handleSvDown}
            onPointerMove={handleSvMove}
            onPointerUp={handleSvUp}
            onPointerCancel={handleSvUp}
            onKeyDown={handleSvKeyDown}
            className="relative w-full rounded-xl overflow-hidden cursor-crosshair touch-none select-none"
            style={{
              height: '9.5rem',
              backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
              backgroundImage:
                'linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0))',
            }}
            role="slider"
            aria-label="饱和度与明度"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(hsl.s * 100)}
            aria-valuetext={`饱和度 ${Math.round(hsl.s * 100)}%，明度 ${Math.round(hsl.l * 100)}%`}
            tabIndex={0}
          >
            {/* 指针 */}
            <div
              className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${hsl.s * 100}%`,
                top: `${(1 - hsl.l) * 100}%`,
                backgroundColor: draftHex,
              }}
            />
          </div>

          {/* 色相条 */}
          <div
            ref={hueStripRef}
            onPointerDown={handleHueDown}
            onPointerMove={handleHueMove}
            onPointerUp={handleHueUp}
            onPointerCancel={handleHueUp}
            onKeyDown={handleHueKeyDown}
            className="relative w-full h-3 rounded-full cursor-pointer touch-none select-none"
            style={{
              backgroundImage:
                'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
            }}
            role="slider"
            aria-label="色相"
            aria-valuemin={0}
            aria-valuemax={360}
            aria-valuenow={Math.round(hsl.h)}
            aria-valuetext={`色相 ${Math.round(hsl.h)} 度`}
            tabIndex={0}
          >
            <div
              className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(hsl.h / 360) * 100}%`,
                backgroundColor: `hsl(${hsl.h}, 100%, 50%)`,
              }}
            />
          </div>

          {/* 十六进制手输 */}
          <div>
            <label
              htmlFor="gp-color-hex-input"
              className="block text-[11px] font-medium text-slate-500 dark:text-gray-400 mb-1"
            >
              十六进制色值
            </label>
            <div className="flex items-center gap-2">
              <input
                id="gp-color-hex-input"
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                inputMode="text"
                className={`flex-1 px-3 py-2 bg-slate-50 dark:bg-gray-950 border rounded-xl font-mono text-xs text-slate-800 dark:text-gray-100 focus:outline-none transition-colors ${
                  hexValid
                    ? 'border-slate-200 dark:border-gray-700 focus:border-blue-500'
                    : 'border-rose-400 dark:border-rose-500'
                }`}
                aria-label="十六进制色值"
                aria-invalid={!hexValid}
              />
              <button
                type="button"
                onClick={() => {
                  const parsed = parseHex(hexInput);
                  if (parsed) {
                    const hex = formatHex(parsed);
                    setDraftHex(hex);
                    setHexInput(hex);
                    setHsl(rgbToHsl(parsed));
                  }
                }}
                disabled={!hexValid}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-xs font-semibold disabled:opacity-40 transition active:scale-95"
              >
                应用
              </button>
            </div>
            {!hexValid && (
              <p className="mt-1 text-[10px] text-rose-500">请输入合法的十六进制色值（如 #3b82f6 或 #fff）</p>
            )}
          </div>

          {/* GIS 专题配色预设 */}
          <div>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-gray-400 mb-2">
              专题配色
            </span>
            <div className="grid grid-cols-6 gap-2">
              {GIS_COLOR_PRESETS.map((preset) => {
                const active = preset.hex.toLowerCase() === draftHex.toLowerCase();
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => {
                      const parsed = parseHex(preset.hex);
                      if (!parsed) return;
                      setDraftHex(preset.hex);
                      setHexInput(preset.hex);
                      setHsl(rgbToHsl(parsed));
                    }}
                    title={preset.name}
                    aria-label={preset.name}
                    aria-pressed={active}
                    className={`relative w-full aspect-square rounded-lg border-2 transition active:scale-90 ${
                      active
                        ? 'border-blue-500 ring-2 ring-blue-500/30'
                        : 'border-slate-300 dark:border-gray-600 hover:border-slate-400'
                    }`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {active && (
                      <Check
                        className="absolute inset-0 m-auto w-4 h-4"
                        style={{ color: isDarkColor(preset.hex) ? '#ffffff' : '#0f172a' }}
                        strokeWidth={3}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部操作 */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/50">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-xs font-semibold active:scale-95 transition"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(hexValid ? draftHex : normalizeHex(draftHex))}
            className="flex-[1.5] py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-blue-500/25 hover:opacity-95 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>确认使用</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(pickerNode, document.body) : pickerNode;
};

export const MobileColorPicker = React.memo(MobileColorPickerBase);
