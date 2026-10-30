import { useState, useRef, useCallback } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export function useToast(defaultDuration = 2800) {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<ToastAction | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback(
    (msg: string, actionOrDuration?: ToastAction | number, maybeDuration?: number) => {
      setToastMessage(msg);

      let action: ToastAction | null = null;
      let duration = defaultDuration;

      if (typeof actionOrDuration === 'number') {
        duration = actionOrDuration;
      } else if (actionOrDuration && typeof actionOrDuration === 'object') {
        action = actionOrDuration;
        if (typeof maybeDuration === 'number') {
          duration = maybeDuration;
        } else {
          duration = 5000; // 有撤回等操作按钮时，延长停留时间到 5 秒
        }
      }

      setToastAction(action);

      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setToastMessage(null);
        setToastAction(null);
        toastTimerRef.current = null;
      }, duration);
    },
    [defaultDuration]
  );

  const clearToast = useCallback(() => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage(null);
    setToastAction(null);
  }, []);

  return {
    toastMessage,
    toastAction,
    setToastAction,
    showToast,
    clearToast,
  };
}
