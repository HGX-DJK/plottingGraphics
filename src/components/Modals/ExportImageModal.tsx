import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Copy, X, Check, Image as ImageIcon, Loader2, Share2, Sparkles } from 'lucide-react';

interface ExportImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading?: boolean;
  onNotify?: (msg: string) => void;
}

/**
 * 将 Base64 DataURL 转换为真正的二进制二进制 Blob
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export const ExportImageModal: React.FC<ExportImageModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  isLoading = false,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  // 下载保存图片 (优先使用 Android 原生相册保存接口，免去权限阻碍)
  const handleDownload = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    const filename = `标绘成果专题图_${Date.now()}.png`;

    try {
      // 1. Android 原生环境：优先调用底层 MediaStore 写入系统图库/相册
      if (typeof window !== 'undefined' && (window as any).AndroidNative?.saveImageToGallery) {
        try {
          const success = (window as any).AndroidNative.saveImageToGallery(imageUrl, filename);
          if (success) {
            onNotify?.('✓ 成果专题图已成功保存至手机系统相册/图库！');
            setIsProcessing(false);
            return;
          }
        } catch (nativeErr) {
          console.warn('Native saveImageToGallery failed, falling back:', nativeErr);
        }
      }

      const blob = dataURLtoBlob(imageUrl);
      const file = new File([blob], filename, { type: 'image/png' });

      // 2. 如果移动端支持 Web Share API (Android / iOS 标准推荐：可直接发送微信好友或存入相册)
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: '标绘成果专题图',
            text: '现场空间地理协同标绘成果专题图',
          });
          onNotify?.('✓ 成果图已成功分享/保存');
          setIsProcessing(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
        }
      }

      // 3. 浏览器标准二进制 Blob 下载触发
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 1500);

      onNotify?.(`✓ 成果图已成功保存: ${filename}`);
    } catch (err) {
      console.error('Download image error:', err);
      try {
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try {
            document.body.removeChild(a);
          } catch {}
        }, 1500);
        onNotify?.(`✓ 成果图已开始下载`);
      } catch {
        onNotify?.('💡 提示：移动端请直接长按图片选择「保存到相册」');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // 微信发送 / 复制图片
  const handleCopyImage = async () => {
    if (!imageUrl) return;
    setIsProcessing(true);
    const filename = `标绘成果专题图_${Date.now()}.png`;

    try {
      // 1. Android 原生环境：直接调起系统分享，支持 1 秒发微信好友/微信朋友圈/QQ/钉钉
      if (typeof window !== 'undefined' && (window as any).AndroidNative?.shareImage) {
        try {
          const success = (window as any).AndroidNative.shareImage(
            imageUrl,
            filename,
            '发送标绘成果专题图'
          );
          if (success) {
            setCopied(true);
            onNotify?.('✓ 已唤起系统分享面板，可直接发送微信好友或群聊！');
            setTimeout(() => setCopied(false), 2500);
            setIsProcessing(false);
            return;
          }
        } catch (nativeShareErr) {
          console.warn('Native shareImage failed, falling back:', nativeShareErr);
        }
      }

      const blob = dataURLtoBlob(imageUrl);

      // 2. PC 端浏览器尝试写入二进制图片到系统剪贴板
      if (
        typeof window !== 'undefined' &&
        (window as any).ClipboardItem &&
        navigator.clipboard &&
        navigator.clipboard.write
      ) {
        try {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({
              'image/png': blob,
            }),
          ]);
          setCopied(true);
          onNotify?.('✓ 高清成果图已复制到剪贴板！可以直接在微信/文档中粘贴发送');
          setTimeout(() => setCopied(false), 2500);
          setIsProcessing(false);
          return;
        } catch (clipErr) {
          console.warn('Clipboard write image failed, trying fallback:', clipErr);
        }
      }

      // 3. Web Share API 降级
      const file = new File([blob], filename, { type: 'image/png' });
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: '标绘成果专题图',
            text: '现场空间地理协同标绘成果专题图',
          });
          setCopied(true);
          onNotify?.('✓ 已唤起系统分享面板，可直接发送微信');
          setTimeout(() => setCopied(false), 2500);
          setIsProcessing(false);
          return;
        } catch (shareErr: any) {
          if (shareErr.name === 'AbortError') {
            setIsProcessing(false);
            return;
          }
        }
      }

      // 4. 移动端友好提示
      onNotify?.('💡 提示：移动端请长按上方图片，选择「保存到相册」或「发送给微信朋友」');
    } catch (err: any) {
      console.error('Copy image error:', err);
      onNotify?.('💡 提示：移动端请长按上方图片，选择「保存到相册」或「发送给朋友」');
    } finally {
      setIsProcessing(false);
    }
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4 pointer-events-auto select-none"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 遮罩 */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      />

      {/* 弹窗卡片 */}
      <div className="relative w-full max-w-lg max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 animate-in zoom-in-95 duration-200">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              高清标绘成果图预览
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 移动端快捷提示横幅 */}
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-2 text-[11px] text-blue-700 dark:text-blue-300 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate">手机端长按下方图片可直接存入相册或发送至微信</span>
        </div>

        {/* 图片预览区域 */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100/70 dark:bg-black/40 min-h-[260px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-gray-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span>正在合成高清成果简报图...</span>
            </div>
          ) : imageUrl ? (
            <div className="relative rounded-2xl overflow-hidden shadow-lg border border-slate-200/80 dark:border-slate-800 max-h-[55vh]">
              <img
                src={imageUrl}
                alt="标绘成果图"
                className="w-full h-auto object-contain max-h-[55vh] pointer-events-auto select-auto"
                style={{
                  WebkitTouchCallout: 'default',
                  userSelect: 'auto',
                }}
              />
            </div>
          ) : (
            <div className="text-xs text-slate-400">生成图片失败，请稍后重试</div>
          )}
        </div>

        {/* 底部操作按钮组 */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0 whitespace-nowrap"
          >
            关闭
          </button>

          <button
            onClick={handleCopyImage}
            disabled={!imageUrl || isLoading || isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 disabled:opacity-40 text-xs font-bold transition active:scale-95 shadow-sm cursor-pointer whitespace-nowrap min-w-0"
            title="调起微信发送或复制图片"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            )}
            <span className="truncate">{copied ? '已调起' : '微信分享'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!imageUrl || isLoading || isProcessing}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white disabled:opacity-40 text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-95 cursor-pointer whitespace-nowrap min-w-0"
            title="直接保存至手机系统相册/图库"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Download className="w-4 h-4 shrink-0" />
            )}
            <span className="truncate">{isProcessing ? '保存中...' : '保存相册'}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : null;
};
