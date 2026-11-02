import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlotLayer, PlotFeature } from '../../types';
import {
  X,
  Download,
  Upload,
  RefreshCw,
  FileCode,
  Check,
  AlertCircle,
  Copy,
} from 'lucide-react';
import {
  exportPlottingProject,
  exportToGeoJSON,
  downloadFile,
} from '../../utils/geoUtils';
import { copyToClipboard } from '../../utils/uiUtils';
import { ConfirmModal } from './ConfirmModal';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: PlotLayer[];
  features: PlotFeature[];
  /** 当前工作图层 ID，用于「当前图层 / 全部图层」导出范围切换 */
  activeLayerId?: string;
  onImportData: (layers: PlotLayer[], features: PlotFeature[]) => void;
  onResetDemo: () => void;
  /** 导出结果提示通道（成功/失败文案） */
  onNotify?: (message: string) => void;
}

/** 导出范围：仅当前工作图层 / 全部图层 */
type ExportScope = 'active' | 'all';

const ImportExportModalBase: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  layers,
  features,
  activeLayerId,
  onImportData,
  onResetDemo,
  onNotify,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [isExporting, setIsExporting] = useState(false);

  // 当前导出范围对应的图层与要素
  const scopedData = useMemo(() => {
    if (exportScope === 'active' && activeLayerId) {
      const scopedLayers = layers.filter((l) => l.id === activeLayerId);
      const scopedFeatures = features.filter((f) => f.layerId === activeLayerId);
      return { layers: scopedLayers, features: scopedFeatures };
    }
    return { layers, features };
  }, [exportScope, activeLayerId, layers, features]);

  const activeLayerName = useMemo(
    () => layers.find((l) => l.id === activeLayerId)?.name || '当前工作图层',
    [layers, activeLayerId]
  );

  const exportScopeLabel =
    exportScope === 'active'
      ? `${activeLayerName}（${scopedData.features.length} 个要素）`
      : `全部图层（${scopedData.features.length} 个要素）`;

  if (!isOpen) return null;

  const handleExportProjectJSON = async () => {
    setIsExporting(true);
    try {
      const jsonStr = exportPlottingProject(scopedData.layers, scopedData.features);
      const result = await downloadFile(
        `GeoPlot_Project_${Date.now()}.json`,
        jsonStr,
        'application/json'
      );
      onNotify?.(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    } catch (err) {
      console.error('[导出工程 JSON] 失败:', err);
      onNotify?.('✗ 工程 JSON 导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGeoJSON = async () => {
    setIsExporting(true);
    try {
      const geojsonStr = exportToGeoJSON(scopedData.features, scopedData.layers);
      const result = await downloadFile(
        `GeoPlot_Features_${Date.now()}.geojson`,
        geojsonStr,
        'application/geo+json'
      );
      onNotify?.(result.ok ? `✓ ${result.message}` : `✗ ${result.message}`);
    } catch (err) {
      console.error('[导出 GeoJSON] 失败:', err);
      onNotify?.('✗ GeoJSON 导出失败，请重试');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyGeoJSON = async () => {
    const geojsonStr = exportToGeoJSON(scopedData.features, scopedData.layers);
    const ok = await copyToClipboard(geojsonStr);
    setCopyFeedback(
      ok ? '✓ 已成功复制标准 GeoJSON 文本至剪贴板！' : '复制失败，请检查浏览器剪贴板权限'
    );
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyProjectJSON = async () => {
    const jsonStr = exportPlottingProject(scopedData.layers, scopedData.features);
    const ok = await copyToClipboard(jsonStr);
    setCopyFeedback(
      ok ? '✓ 已成功复制工程数据 JSON 至剪贴板！' : '复制失败，请检查浏览器剪贴板权限'
    );
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // 如果是 GeoPlot 导出的完整项目数据
        if (parsed.layers && parsed.features) {
          onImportData(parsed.layers, parsed.features);
          setImportError(null);
          setImportStatus(`成功导入 ${parsed.layers.length} 个图层，${parsed.features.length} 个要素！`);
          setTimeout(() => {
            onClose();
          }, 1200);
          return;
        }

        // 如果是标准 GeoJSON
        if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
          // 本应用导出的 GeoJSON 在 properties 中保留了原始 layerId 与图层名，
          // 导入时按此还原图层结构，避免「全部要素挤进一个图层」丢失分组。
          const sourceLayerIds = Array.from(
            new Set<string>(
              parsed.features
                .map((f: any) => f.properties?.layerId)
                .filter((id: any): id is string => typeof id === 'string' && id.length > 0)
            )
          );
          const hasLayerStructure = sourceLayerIds.length > 0;

          // 图层调色板：按图层数量循环取色，保证还原后各图层视觉可区分
          const palette = [
            '#06b6d4',
            '#f59e0b',
            '#8b5cf6',
            '#10b981',
            '#ef4444',
            '#3b82f6',
            '#ec4899',
            '#f97316',
          ];

          // 建立「原始 layerId → 新 layerId」映射
          const layerIdMap = new Map<string, string>();
          const importedLayers: PlotLayer[] = [];

          if (hasLayerStructure) {
            sourceLayerIds.forEach((oldId: string, idx: number) => {
              const newId = `layer-import-${Date.now()}-${idx}`;
              layerIdMap.set(oldId, newId);
              // 优先取 GeoJSON properties 中记录的原图层名
              const sampleFeature = parsed.features.find(
                (f: any) => f.properties?.layerId === oldId
              );
              const originName = sampleFeature?.properties?.layerName;
              importedLayers.push({
                id: newId,
                name: originName || `导入图层_${idx + 1}`,
                color: palette[idx % palette.length],
                visible: true,
                locked: false,
                opacity: 0.9,
                createdAt: Date.now(),
              });
            });
          }

          // 无图层信息的第三方 GeoJSON：统一落到单一图层
          const fallbackLayerId = `layer-import-${Date.now()}`;
          if (!hasLayerStructure) {
            importedLayers.push({
              id: fallbackLayerId,
              name: `导入图层_${file.name.replace(/\.[^/.]+$/, '')}`,
              color: '#06b6d4',
              visible: true,
              locked: false,
              opacity: 0.9,
              createdAt: Date.now(),
            });
          }

          const importedFeatures: PlotFeature[] = parsed.features.map(
            (f: any, idx: number) => {
              const geomType = f.geometry?.type;
              let coords: [number, number][] = [];
              let fType = 'polygon';

              if (geomType === 'Point') {
                coords = [f.geometry.coordinates];
                fType = 'marker';
              } else if (geomType === 'LineString') {
                coords = f.geometry.coordinates;
                fType = 'polyline';
              } else if (geomType === 'Polygon') {
                coords = f.geometry.coordinates[0] || [];
                fType = 'polygon';
              }

              /**
               * 优先用导出时保留的原始控制点还原要素。
               *
               * 本应用导出的面类要素，geometry 里放的是「渲染后的真实图形」
               * （圆=64边多边形、箭头=展开轮廓），而渲染这些要素需要的是
               * 绘制时的控制点（圆心+半径边点、扇面圆心+边缘点、箭头首尾点）。
               * 直接拿图形轮廓当控制点，往返一次圆就会以环上某点为圆心、半径回落默认值，
               * 扇面与集结地域同样错位。因此这里优先取 sourceCoords。
               *
               * 第三方 GeoJSON 没有该字段时，仍按几何类型推断，退回原有行为。
               */
              const sourceCoords = f.properties?.sourceCoords;
              const isValidSourceCoords =
                Array.isArray(sourceCoords) &&
                sourceCoords.length > 0 &&
                sourceCoords.every(
                  (p: any) =>
                    Array.isArray(p) &&
                    p.length >= 2 &&
                    Number.isFinite(Number(p[0])) &&
                    Number.isFinite(Number(p[1]))
                );
              if (isValidSourceCoords) {
                coords = sourceCoords.map((p: any) => [Number(p[0]), Number(p[1])]);
              }

              const originLayerId = f.properties?.layerId;
              const targetLayerId = hasLayerStructure
                ? layerIdMap.get(originLayerId) || importedLayers[0].id
                : fallbackLayerId;

              // 复用导出时的样式，避免导入后配色丢失
              const layerColor =
                importedLayers.find((l) => l.id === targetLayerId)?.color || '#06b6d4';

              // 保留导出时的圆半径与量算指标，避免往返后丢失
              const radius = Number(f.properties?.radius);
              const calculatedArea = Number(f.properties?.calculatedArea);
              const calculatedLength = Number(f.properties?.calculatedLength);

              return {
                id: `feat-imp-${Date.now()}-${idx}`,
                name: f.properties?.name || `导入要素_${idx + 1}`,
                type: f.properties?.type || fType,
                layerId: targetLayerId,
                coordinates: coords,
                properties: {
                  strokeColor: f.properties?.strokeColor || layerColor,
                  strokeWidth: f.properties?.strokeWidth || 2,
                  strokeDasharray: f.properties?.strokeDasharray || 'solid',
                  fillColor: f.properties?.fillColor || layerColor,
                  fillOpacity: f.properties?.fillOpacity ?? 0.35,
                  notes: f.properties?.notes || '外部导入数据',
                  // 文字注记与颜色
                  ...(typeof f.properties?.text === 'string'
                    ? { text: f.properties.text }
                    : {}),
                  ...(typeof f.properties?.textColor === 'string'
                    ? { textColor: f.properties.textColor }
                    : {}),
                  ...(Number.isFinite(f.properties?.textSize)
                    ? { textSize: f.properties.textSize }
                    : {}),
                  // 圆半径：丢失会导致圆心与半径都还原不准
                  ...(Number.isFinite(radius) && radius > 0 ? { radius } : {}),
                  // 空间量算指标
                  ...(Number.isFinite(calculatedArea) && calculatedArea > 0
                    ? { calculatedArea }
                    : {}),
                  ...(Number.isFinite(calculatedLength) && calculatedLength > 0
                    ? { calculatedLength }
                    : {}),
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
            }
          );

          onImportData([...layers, ...importedLayers], [...features, ...importedFeatures]);
          setImportError(null);
          setImportStatus(
            hasLayerStructure
              ? `成功导入 ${importedFeatures.length} 个 GeoJSON 要素，还原 ${importedLayers.length} 个图层！`
              : `成功导入 ${importedFeatures.length} 个 GeoJSON 要素到新图层！`
          );
          setTimeout(() => {
            onClose();
          }, 1200);
          return;
        }

        setImportError('未识别的文件格式，请导入标准的 GeoPlot JSON 或 GeoJSON 文件。');
      } catch (err) {
        console.error(err);
        setImportError('文件解析失败，请确保文件格式正确且未损坏。');
      }
    };
    reader.readAsText(file);
  };

  const modalNode = (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-950/50">
          <div className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold text-sm">
            <FileCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>标绘工程数据导入 / 导出</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {importError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 rounded-xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importStatus && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {copyFeedback && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-500/50 rounded-xl text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <span>{copyFeedback}</span>
            </div>
          )}

          {/* 导出区域 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
                标绘数据导出与共享
              </span>
              {/* 导出范围切换：仅当前工作图层 / 全部图层 */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-gray-800">
                <button
                  onClick={() => setExportScope('active')}
                  disabled={!activeLayerId}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    exportScope === 'active'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-slate-500 dark:text-gray-400'
                  }`}
                  title={activeLayerId ? `仅导出「${activeLayerName}」的要素` : '当前没有工作图层'}
                >
                  当前图层
                </button>
                <button
                  onClick={() => setExportScope('all')}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                    exportScope === 'all'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-300 shadow-sm'
                      : 'text-slate-500 dark:text-gray-400'
                  }`}
                  title="导出全部图层的要素"
                >
                  全部图层
                </button>
              </div>
            </div>

            {/* 导出范围提示：明确告诉用户会导出什么 */}
            <div className="px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-gray-800/50 border border-slate-200/70 dark:border-gray-700/60 text-[10px] text-slate-500 dark:text-gray-400 flex items-center justify-between gap-2">
              <span className="truncate">导出范围：{exportScopeLabel}</span>
              <span className="shrink-0 font-mono">{scopedData.layers.length} 图层</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleExportGeoJSON}
                disabled={isExporting || scopedData.features.length === 0}
                className="flex items-center justify-center gap-2 p-3 bg-slate-50 dark:bg-gray-950 hover:bg-slate-100 dark:hover:bg-gray-850 border border-slate-200 dark:border-gray-800 hover:border-emerald-500/50 rounded-xl text-xs text-slate-800 dark:text-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="下载标准 GeoJSON 文件（可在 QGIS / ArcGIS 中打开）"
              >
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>下载 GeoJSON</span>
              </button>
              <button
                onClick={handleCopyGeoJSON}
                disabled={scopedData.features.length === 0}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="一键复制 GeoJSON 文本至剪贴板"
              >
                <Copy className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>一键复制 GeoJSON</span>
              </button>

              <button
                onClick={handleExportProjectJSON}
                disabled={isExporting}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 dark:bg-gray-950 hover:bg-slate-100 dark:hover:bg-gray-850 border border-slate-200 dark:border-gray-800 hover:border-blue-500/50 rounded-xl text-xs text-slate-700 dark:text-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="下载 GeoPlot 工程备份文件（含图层结构，可原样导回）"
              >
                <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>下载工程 (JSON)</span>
              </button>
              <button
                onClick={handleCopyProjectJSON}
                className="flex items-center justify-center gap-2 p-2.5 bg-slate-50 dark:bg-gray-950 hover:bg-slate-100 dark:hover:bg-gray-850 border border-slate-200 dark:border-gray-800 hover:border-blue-500/50 rounded-xl text-xs text-slate-700 dark:text-gray-300 transition"
                title="一键复制工程备份 JSON 文本"
              >
                <Copy className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>复制工程 JSON</span>
              </button>
            </div>
          </div>

          {/* 导入区域 */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-800">
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-400 uppercase tracking-wider">
              外部数据导入
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.geojson"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-xs font-medium text-blue-700 dark:text-blue-300 transition"
            >
              <Upload className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>选择本地 JSON / GeoJSON 文件导入</span>
            </button>
          </div>

          {/* 重置默认态势 */}
          <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-slate-50 dark:bg-gray-950 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800 rounded-xl text-xs text-slate-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>恢复内置演训态势演示数据</span>
            </button>
          </div>
        </div>
      </div>

      {/* 中文定制重置确认弹窗 */}
      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={() => {
          onResetDemo();
          onClose();
        }}
        title="恢复默认态势演示数据确认"
        message="确定恢复初始演训演示态势吗？当前工程中未保存的修改将被覆盖。"
        confirmText="确定恢复"
        cancelText="取消"
        type="warning"
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalNode, document.body) : modalNode;
};

/**
 * 记忆化包装：上层组件的无关状态变化（如视口中心、缩放级别刷新）
 * 不再触发本组件整体重渲染，避免移动端无谓的整树 diff 开销。
 */
export const ImportExportModal = React.memo(ImportExportModalBase);
