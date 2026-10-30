import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Copy, X, Check, Image as ImageIcon, Loader2 } from 'lucide-react';
import { downloadFile } from '../../utils/geoUtils';

interface ExportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading?: boolean;
  onNotify?: (msg: string) => void;
}

export const ExportImageModal: React.FC<ExportImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  isLoading = false,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!imageUrl) return;
    const filename = `标绘成果简报_${Date.now()}.png`;
    downloadFile(filename, imageUrl, 'image/png');
    onNotify?.(`✓ 成果图已成功保存: ${filename}`);
  };

  const handleCopyImage = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      if ((window as any).ClipboardItem && navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new (window as any).ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        setCopied(true);
        onNotify?.('✓ 高清标绘成果图已复制到剪贴板！可以直接在微信粘贴发送');
        setTimeout(() => setCopied(false), 2000);
      } else {
        handleDownload();
      }
    } catch {
      handleDownload();
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-auto select-none"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 遮罩 */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* 弹窗卡片 */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              高清标绘成果图预览
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 图片预览区域 */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/70 dark:bg-black/40 min-h-[260px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-gray-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span>正在合成高清成果简报图...</span>
            </div>
          ) : imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-gray-800 max-h-[58vh]">
              <img
                src={imageUrl}
                alt="标绘成果图"
                className="w-full h-auto object-contain max-h-[58vh]"
              />
            </div>
          ) : (
            <div className="text-xs text-slate-400">生成图片失败，请稍后重试</div>
          )}
        </div>

        {/* 底部操作按钮 */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-slate-200 dark:border-gray-800 flex items-center justify-end gap-2.5 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition"
          >
            关闭
          </button>

          <button
            onClick={handleCopyImage}
            disabled={!imageUrl || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-700 disabled:opacity-40 text-xs font-bold transition active:scale-95 shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? '已复制' : '复制图片'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!imageUrl || isLoading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>下载保存图片</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
