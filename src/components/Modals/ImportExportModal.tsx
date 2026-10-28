import React, { useRef, useState } from 'react';
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
import { ConfirmModal } from './ConfirmModal';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  layers: PlotLayer[];
  features: PlotFeature[];
  onImportData: (layers: PlotLayer[], features: PlotFeature[]) => void;
  onResetDemo: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  layers,
  features,
  onImportData,
  onResetDemo,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  if (!isOpen) return null;

  const handleExportProjectJSON = () => {
    const jsonStr = exportPlottingProject(layers, features);
    downloadFile(`GeoPlot_Project_${Date.now()}.json`, jsonStr);
  };

  const handleExportGeoJSON = () => {
    const geojsonStr = exportToGeoJSON(features);
    downloadFile(`GeoPlot_Features_${Date.now()}.geojson`, geojsonStr);
  };

  const handleCopyGeoJSON = () => {
    const geojsonStr = exportToGeoJSON(features);
    navigator.clipboard?.writeText(geojsonStr);
    setCopyFeedback('✓ 已成功复制标准 GeoJSON 文本至剪贴板！');
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const handleCopyProjectJSON = () => {
    const jsonStr = exportPlottingProject(layers, features);
    navigator.clipboard?.writeText(jsonStr);
    setCopyFeedback('✓ 已成功复制工程数据 JSON 至剪贴板！');
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
          setImportStatus(`成功导入 ${parsed.layers.length} 个图层，${parsed.features.length} 个要素！`);
          setTimeout(() => {
            onClose();
          }, 1200);
          return;
        }

        // 如果是标准 GeoJSON
        if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
          const newLayer: PlotLayer = {
            id: `layer-import-${Date.now()}`,
            name: `导入图层_${file.name.replace(/\.[^/.]+$/, '')}`,
            color: '#06b6d4',
            visible: true,
            locked: false,
            opacity: 0.9,
            createdAt: Date.now(),
          };

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

              return {
                id: `feat-imp-${Date.now()}-${idx}`,
                name: f.properties?.name || `导入要素_${idx + 1}`,
                type: f.properties?.type || fType,
                layerId: newLayer.id,
                coordinates: coords,
                properties: {
                  strokeColor: f.properties?.strokeColor || '#06b6d4',
                  strokeWidth: f.properties?.strokeWidth || 2,
                  strokeDasharray: 'solid',
                  fillColor: f.properties?.fillColor || '#06b6d4',
                  fillOpacity: 0.35,
                  notes: f.properties?.notes || '外部导入数据',
                },
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
            }
          );

          onImportData([...layers, newLayer], [...features, ...importedFeatures]);
          setImportStatus(`成功导入 ${importedFeatures.length} 个 GeoJSON 要素到新图层！`);
          setTimeout(() => {
            onClose();
          }, 1200);
          return;
        }

        alert('未识别的文件格式，请导入标准的 GeoPlot JSON 或 GeoJSON 文件。');
      } catch (err) {
        console.error(err);
        alert('文件解析失败，请确保格式正确。');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <FileCode className="w-4 h-4 text-blue-400" />
            <span>标绘工程数据导入 / 导出</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {importStatus && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{importStatus}</span>
            </div>
          )}

          {copyFeedback && (
            <div className="p-3 bg-blue-950/40 border border-blue-500/50 rounded-xl text-blue-300 text-xs flex items-center gap-2 animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{copyFeedback}</span>
            </div>
          )}

          {/* 导出区域 */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              标绘数据导出与共享
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleExportGeoJSON}
                className="flex items-center justify-center gap-2 p-3 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-emerald-500/50 rounded-xl text-xs text-gray-200 transition"
                title="下载标准 GeoJSON 文件"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>下载 GeoJSON</span>
              </button>
              <button
                onClick={handleCopyGeoJSON}
                className="flex items-center justify-center gap-2 p-3 bg-emerald-950/30 hover:bg-emerald-900/40 border border-emerald-500/40 rounded-xl text-xs font-semibold text-emerald-300 transition"
                title="一键复制 GeoJSON 文本至剪贴板"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>一键复制 GeoJSON</span>
              </button>

              <button
                onClick={handleExportProjectJSON}
                className="flex items-center justify-center gap-2 p-2.5 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-blue-500/50 rounded-xl text-xs text-gray-300 transition"
                title="下载 GeoPlot 工程备份文件"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>下载工程 (JSON)</span>
              </button>
              <button
                onClick={handleCopyProjectJSON}
                className="flex items-center justify-center gap-2 p-2.5 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-blue-500/50 rounded-xl text-xs text-gray-300 transition"
                title="一键复制工程备份 JSON 文本"
              >
                <Copy className="w-3.5 h-3.5 text-blue-400" />
                <span>复制工程 JSON</span>
              </button>
            </div>
          </div>

          {/* 导入区域 */}
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
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
              className="w-full flex items-center justify-center gap-2 p-3 bg-blue-950/30 hover:bg-blue-900/40 border border-blue-800/60 rounded-xl text-xs font-medium text-blue-300 transition"
            >
              <Upload className="w-4 h-4 text-blue-400" />
              <span>选择本地 JSON / GeoJSON 文件导入</span>
            </button>
          </div>

          {/* 重置默认态势 */}
          <div className="pt-2 border-t border-gray-800">
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 bg-gray-950 hover:bg-gray-800 border border-gray-800 rounded-xl text-xs text-gray-400 hover:text-amber-300 transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
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
};
