import React from 'react';
import { AlertTriangle, RotateCcw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * 全局错误边界。
 *
 * 地图标绘应用在渲染阶段一旦抛出未捕获异常，React 会卸载整棵树，
 * 表现为「白屏 / 整个 App 卡死」，用户除了杀进程之外没有任何自救手段。
 * 这里兜住渲染期异常，给出可操作的恢复入口：
 *   - 重新加载：网络抖动、地图瓦片初始化失败等偶发问题
 *   - 重试渲染：可恢复的渲染错误，不丢失当前会话状态
 *   - 清除本地数据：LocalStorage 中的工程数据损坏导致反复崩溃时的兜底
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[GeoPlot] 未捕获的渲染异常:', error, errorInfo.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleRetry = (): void => {
    this.setState({ error: null, errorInfo: null });
  };

  handleClearAndReload = (): void => {
    try {
      window.localStorage.clear();
    } catch (e) {
      console.error('[GeoPlot] 清除本地数据失败:', e);
    }
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error, errorInfo } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full min-h-screen w-full items-center justify-center bg-slate-950 p-6 text-slate-100">
        <div className="flex w-full max-w-lg flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
              <AlertTriangle size={22} />
            </span>
            <div>
              <h1 className="text-lg font-semibold">应用出现异常</h1>
              <p className="text-sm text-slate-400">标绘界面渲染中断，本地已保存的数据不会丢失。</p>
            </div>
          </div>

          <div className="max-h-40 overflow-auto rounded-lg border border-slate-800 bg-slate-950/70 p-3">
            <p className="font-mono text-xs leading-relaxed text-rose-300">{error.message || String(error)}</p>
            {errorInfo?.componentStack ? (
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-slate-500">
                {errorInfo.componentStack}
              </pre>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              <RotateCcw size={15} />
              重试渲染
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              重新加载
            </button>
            <button
              type="button"
              onClick={this.handleClearAndReload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-900/70 px-3 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-950/60"
            >
              <Trash2 size={15} />
              清除本地数据并重载
            </button>
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            若反复出现该问题，请反馈异常信息与操作步骤。「清除本地数据并重载」会删除本机保存的全部图层与要素，
            请谨慎使用。
          </p>
        </div>
      </div>
    );
  }
}

export default React.memo(ErrorBoundary);
