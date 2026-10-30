/**
 * 轻量 UI 基础设施：滚动锁、焦点陷阱、剪贴板反馈
 * 供各弹层（BottomSheet / Modal）复用，避免重复实现与相互冲突。
 */

/* ==========================================================================
   1. 滚动锁：引用计数，支持多个弹层叠加时互不误解锁
   ========================================================================== */
let lockCount = 0;
let savedOverflow = '';

export function lockBodyScroll(): () => void {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0) {
      document.body.style.overflow = savedOverflow;
    }
  };
}

/* ==========================================================================
   2. 焦点陷阱：弹层打开时将 Tab 键循环限制在弹层内部
   ========================================================================== */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function trapFocus(
  container: HTMLElement | null,
  options?: { autoFocus?: boolean; focusFirst?: boolean; restoreFocus?: boolean }
): () => void {
  if (!container) return () => {};

  // 记录打开弹层前的焦点位置：关闭时归还给触发元素（ARIA 对话框标准行为），
  // 避免关闭后焦点落到 body，键盘用户只能从头 Tab。
  const previouslyFocused =
    options?.restoreFocus === false
      ? null
      : document.activeElement instanceof HTMLElement &&
          document.activeElement !== document.body
        ? document.activeElement
        : null;

  // 打开弹层时把焦点移入弹层，避免焦点仍滞留在背景触发按钮上
  if (options?.autoFocus !== false) {
    try {
      if (options?.focusFirst === false) {
        // 聚焦对话框容器本身（标准 dialog 模式），Tab 可自然进入内部首个可聚焦元素
        if (typeof container.focus === 'function') container.focus();
      } else {
        const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (first) {
          first.focus();
        } else if (typeof container.focus === 'function') {
          container.focus();
        }
      }
    } catch {
      // 忽略个别浏览器对 focus 的限制
    }
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const focusables = Array.from(
      container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', handleKeyDown, true);

  return () => {
    document.removeEventListener('keydown', handleKeyDown, true);
    // 归还焦点：触发元素可能已被卸载，此时静默跳过
    if (previouslyFocused && previouslyFocused.isConnected) {
      try {
        previouslyFocused.focus({ preventScroll: true });
      } catch {
        // 忽略个别浏览器对 focus 的限制
      }
    }
  };
}

/* ==========================================================================
   2.1 背景隔离：弹层打开时把应用根节点置为 inert
   弹层均通过 Portal 渲染到 document.body，不受 #root 影响，
   因此置 inert 后既不会误触背景，也不会让读屏软件读到背景内容。
   采用引用计数，支持「抽屉内再开确认弹窗」等叠加场景互不误解隔离。
   ========================================================================== */
let inertCount = 0;

export function setBackgroundInert(active: boolean): () => void {
  const root = document.getElementById('root');
  if (!root) return () => {};

  if (!active) {
    inertCount = 0;
    root.removeAttribute('inert');
    root.removeAttribute('aria-hidden');
    return () => {};
  }

  inertCount += 1;
  root.setAttribute('inert', '');
  root.setAttribute('aria-hidden', 'true');

  let released = false;
  return () => {
    if (released) return;
    released = true;
    inertCount = Math.max(0, inertCount - 1);
    if (inertCount === 0) {
      root.removeAttribute('inert');
      root.removeAttribute('aria-hidden');
    }
  };
}

/* ==========================================================================
   3. 剪贴板：真实写入并反馈失败，杜绝「假成功」提示
   ========================================================================== */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // 降级到 execCommand
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
