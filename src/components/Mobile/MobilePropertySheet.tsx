import React, { useState, useEffect, useRef } from 'react';
import { PlotFeature, PlotLayer } from '../../types';
import {
  Sliders,
  Palette,
  Layers,
  Trash2,
  Type,
  FileText,
  Compass,
  Ruler,
  Maximize2,
  Tag,
  Plus,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { ConfirmModal } from '../Modals/ConfirmModal';
import { formatArea, formatDistance } from '../../utils/geoUtils';

interface MobilePropertySheetProps {
  isOpen: boolean;
  onClose: () => void;
  feature: PlotFeature | null;
  layers: PlotLayer[];
  onUpdateFeature: (updated: PlotFeature) => void;
  onDeleteFeature: (featureId: string) => void;
}

export const MobilePropertySheet: React.FC<MobilePropertySheetProps> = ({
  isOpen,
  onClose,
  feature,
  layers,
  onUpdateFeature,
  onDeleteFeature,
}) => {
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');
  const [showAddAttr, setShowAddAttr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * 属性编辑草稿 + 节流提交。
   * 背景：滑块拖动 / 文本连打时，原实现每次 onChange 都直接回写 features，
   * 导致地图组件的全量几何体重建被逐帧触发，触控端明显卡顿。
   * 现在改为「本地草稿即时刷新 UI + 150ms 节流回写」，拖动过程不再重建几何体。
   */
  const [draft, setDraft] = useState<{ featureId: string; next: PlotFeature } | null>(null);
  const draftRef = useRef<{ featureId: string; next: PlotFeature } | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const featureIdRef = useRef<string | null>(null);

  const syncDraft = (next: { featureId: string; next: PlotFeature }) => {
    draftRef.current = next;
    setDraft(next);
  };

  const scheduleCommit = (next: { featureId: string; next: PlotFeature }) => {
    syncDraft(next);
    pendingRef.current = true;
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
    }
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null;
      pendingRef.current = false;
      const d = draftRef.current;
      if (d) onUpdateFeature(d.next);
    }, 150);
  };

  // 立即提交挂起的编辑（切换/关闭要素前调用，避免丢失最后一次改动）
  const flushDraft = () => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (!pendingRef.current) return;
    pendingRef.current = false;
    const d = draftRef.current;
    if (d) onUpdateFeature(d.next);
  };

  // 外部要素数据变化时同步草稿；切换要素前先提交未落盘的编辑
  useEffect(() => {
    if (!feature) {
      // 要素被关闭：提交挂起的编辑
      flushDraft();
      return;
    }
    if (featureIdRef.current !== feature.id) {
      // 切换到另一个要素：先把上一个要素的挂起编辑落盘
      flushDraft();
      featureIdRef.current = feature.id;
      syncDraft({ featureId: feature.id, next: feature });
      return;
    }
    // 同一要素：仅在无挂起编辑时跟随外部数据同步，避免覆盖用户正在编辑的值
    if (!pendingRef.current) {
      syncDraft({ featureId: feature.id, next: feature });
    }
  }, [feature]);

  // 组件卸载时清理定时器并提交挂起编辑
  useEffect(
    () => () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
    },
    []
  );

  if (!feature) return null;

  // 当前正在编辑的要素快照（优先使用草稿，保证输入框实时跟手）
  const editingFeature = draft && draft.featureId === feature.id ? draft.next : feature;

  const handleNameChange = (name: string) => {
    scheduleCommit({
      featureId: editingFeature.id,
      next: { ...editingFeature, name, updatedAt: Date.now() },
    });
  };

  const handleLayerChange = (layerId: string) => {
    scheduleCommit({
      featureId: editingFeature.id,
      next: { ...editingFeature, layerId, updatedAt: Date.now() },
    });
  };

  const handlePropChange = (key: string, value: any) => {
    scheduleCommit({
      featureId: editingFeature.id,
      next: {
        ...editingFeature,
        properties: {
          ...editingFeature.properties,
          [key]: value,
        },
        updatedAt: Date.now(),
      },
    });
  };

  const handleAddCustomAttribute = () => {
    if (!newAttrKey.trim()) return;
    const existing = feature.properties.customAttributes || {};
    handlePropChange('customAttributes', {
      ...existing,
      [newAttrKey.trim()]: newAttrVal.trim(),
    });
    setNewAttrKey('');
    setNewAttrVal('');
    setShowAddAttr(false);
  };

  const handleDeleteCustomAttribute = (key: string) => {
    const existing = { ...(editingFeature.properties.customAttributes || {}) };
    delete existing[key];
    handlePropChange('customAttributes', existing);
  };

  const isPolygonLike =
    feature.type === 'polygon' ||
    feature.type === 'rectangle' ||
    feature.type === 'circle' ||
    feature.type.includes('arrow') ||
    feature.type === 'gathering-place' ||
    feature.type === 'sector';

  const isTextOrPoint =
    feature.type === 'text' ||
    feature.type === 'marker' ||
    feature.type.startsWith('point-') ||
    feature.type.startsWith('post-');

  const pointCoord = feature.coordinates[0];

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="GIS 要素属性与指标"
      icon={<Sliders className="w-4 h-4" />}
      headerAction={
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono font-medium">
          {feature.type}
        </span>
      }
    >
      <div className="space-y-4 pb-4 text-xs">
        {/* 1. GIS 空间几何量算指标卡 (GISer 核心) */}
        <div className="p-3 bg-gradient-to-r from-blue-50/80 to-slate-50 dark:from-blue-950/40 dark:to-slate-900 border border-blue-200/80 dark:border-blue-900/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-slate-700 dark:text-gray-300 text-[11px] font-bold">
            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
              <Compass className="w-3.5 h-3.5" />
              <span>空间几何指标</span>
            </span>
            <span className="text-slate-400 dark:text-gray-500 font-mono text-[10px]">WGS84 / EPSG:4326</span>
          </div>

          {/* 点坐标 */}
          {isTextOrPoint && pointCoord && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-950/70 border border-slate-200 dark:border-gray-800/80 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 dark:text-gray-400">经度: </span>
                <span className="text-slate-800 dark:text-gray-200 font-semibold">{pointCoord[0].toFixed(5)}°</span>
                <span className="text-slate-300 dark:text-gray-600 mx-2">|</span>
                <span className="text-slate-400 dark:text-gray-400">纬度: </span>
                <span className="text-slate-800 dark:text-gray-200 font-semibold">{pointCoord[1].toFixed(5)}°</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${pointCoord[0]},${pointCoord[1]}`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="p-1 rounded text-slate-400 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition"
                title="复制坐标"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}

          {/* 面积与周长指标 */}
          {isPolygonLike && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-white dark:bg-gray-950/70 border border-slate-200 dark:border-gray-800/80">
                <div className="text-slate-500 dark:text-gray-400 flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  <span>计算面积</span>
                </div>
                <div className="font-bold text-slate-800 dark:text-gray-100 font-mono mt-0.5 truncate">
                  {feature.properties.calculatedArea
                    ? formatArea(feature.properties.calculatedArea)
                    : feature.properties.radius
                    ? formatArea(Math.PI * feature.properties.radius * feature.properties.radius)
                    : '自动多边形测算'}
                </div>
              </div>

              <div className="p-2 rounded-lg bg-white dark:bg-gray-950/70 border border-slate-200 dark:border-gray-800/80">
                <div className="text-slate-500 dark:text-gray-400 flex items-center gap-1">
                  <Ruler className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
                  <span>边界周长</span>
                </div>
                <div className="font-bold text-slate-800 dark:text-gray-100 font-mono mt-0.5 truncate">
                  {feature.properties.calculatedLength
                    ? formatDistance(feature.properties.calculatedLength)
                    : feature.properties.radius
                    ? formatDistance(2 * Math.PI * feature.properties.radius)
                    : '自动计算'}
                </div>
              </div>
            </div>
          )}

          {/* 线要素长度指标 */}
          {(feature.type === 'polyline' || feature.type === 'freehand') && (
            <div className="p-2 rounded-lg bg-white dark:bg-gray-950/70 border border-slate-200 dark:border-gray-800/80 flex items-center justify-between text-[11px]">
              <div className="text-slate-500 dark:text-gray-400 flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>折线空间总长度:</span>
              </div>
              <div className="font-bold text-slate-800 dark:text-gray-100 font-mono">
                {formatDistance(feature.properties.calculatedLength || 0)}
              </div>
            </div>
          )}
        </div>

        {/* 2. 基本属性 */}
        <div className="space-y-3">
          <div>
            <label className="block text-slate-600 dark:text-gray-400 font-medium mb-1">要素名称</label>
            <input
              type="text"
              value={editingFeature.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-800 dark:text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label className="text-slate-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                <span>所属工作图层</span>
              </label>
              {layers.find((l) => l.id === editingFeature.layerId) && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full ring-1 ring-slate-300 dark:ring-white/20"
                    style={{ backgroundColor: layers.find((l) => l.id === editingFeature.layerId)?.color }}
                  />
                  <span className="text-slate-700 dark:text-gray-300 font-semibold truncate max-w-[120px]">
                    {layers.find((l) => l.id === editingFeature.layerId)?.name}
                  </span>
                </div>
              )}
            </div>
            <select
              value={editingFeature.layerId}
              onChange={(e) => handleLayerChange(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-slate-300 dark:border-gray-700/80 rounded-xl text-slate-800 dark:text-gray-200 text-xs focus:outline-none focus:border-blue-500"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} {l.id === editingFeature.layerId ? '(当前归属图层)' : ''}
                </option>
              ))}
            </select>
            <div className="text-[10px] text-slate-400 dark:text-gray-500">
              更改归属图层后，要素将移动至目标图层树，受其显隐、锁定与透明度管控。
            </div>
          </div>
        </div>

        {/* 3. GIS 自定义业务属性表 (Attribute Table) */}
        <div className="p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-700 dark:text-gray-300 font-medium flex items-center gap-1 text-[11px]">
              <Tag className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>GIS 业务属性字段</span>
            </span>
            <button
              onClick={() => setShowAddAttr(!showAddAttr)}
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-[11px] font-medium"
            >
              <Plus className="w-3 h-3" />
              <span>添加字段</span>
            </button>
          </div>

          {showAddAttr && (
            <div className="p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="字段名 (如 用地性质)"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-700 rounded text-xs text-slate-800 dark:text-gray-100"
                />
                <input
                  type="text"
                  placeholder="字段值 (如 居住用地)"
                  value={newAttrVal}
                  onChange={(e) => setNewAttrVal(e.target.value)}
                  className="px-2 py-1.5 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-700 rounded text-xs text-slate-800 dark:text-gray-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddAttr(false)}
                  className="px-2 py-1 text-[10px] text-slate-500 dark:text-gray-400 rounded hover:bg-slate-100 dark:hover:bg-gray-800"
                >
                  取消
                </button>
                <button
                  onClick={handleAddCustomAttribute}
                  className="px-3 py-1 text-[10px] bg-blue-600 text-white font-medium rounded hover:bg-blue-500"
                >
                  确定添加
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {feature.properties.customAttributes &&
            Object.keys(feature.properties.customAttributes).length > 0 ? (
              Object.entries(feature.properties.customAttributes).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900/60 border border-slate-200 dark:border-gray-800/80 text-[11px]"
                >
                  <span className="text-slate-600 dark:text-gray-400 font-medium">{k}:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 dark:text-gray-200 font-medium">{v}</span>
                    <button
                      onClick={() => handleDeleteCustomAttribute(k)}
                      className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-0.5"
                      title="删除字段"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-slate-400 dark:text-gray-500 italic py-1">
                暂无扩展业务属性，可点击右上角添加
              </div>
            )}
          </div>
        </div>

        {/* 4. 文字注记 */}
        {isTextOrPoint && (
          <div className="p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800 space-y-3">
            <div>
              <label className="block text-slate-600 dark:text-gray-400 font-medium mb-1 flex items-center gap-1">
                <Type className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                <span>地图注记文字</span>
              </label>
              <input
                type="text"
                value={editingFeature.properties.text || ''}
                onChange={(e) => handlePropChange('text', e.target.value)}
                placeholder="地图显示标签内容"
                className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 rounded-lg text-slate-800 dark:text-gray-100"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-gray-400">文字颜色</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editingFeature.properties.textColor || '#ffffff'}
                  onChange={(e) => handlePropChange('textColor', e.target.value)}
                  className="w-11 h-11 p-0 bg-transparent rounded-xl cursor-pointer border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950"
                  aria-label="选择文字颜色"
                />
                <span className="font-mono text-slate-500 dark:text-gray-400">
                  {editingFeature.properties.textColor || '#ffffff'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. 符号化与样式 (边框线条与填充) */}
        <div className="p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-slate-600 dark:text-gray-400 font-medium flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-slate-500 dark:text-gray-500" />
              <span>边框/线条颜色</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={editingFeature.properties.strokeColor}
                onChange={(e) => handlePropChange('strokeColor', e.target.value)}
                className="w-11 h-11 p-0 bg-transparent rounded-xl cursor-pointer border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950"
                aria-label="选择边框线条颜色"
              />
              <span className="font-mono text-slate-500 dark:text-gray-400">
                {editingFeature.properties.strokeColor}
              </span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-slate-600 dark:text-gray-400 mb-1">
              <span>线宽粗细</span>
              <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                {editingFeature.properties.strokeWidth} px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={editingFeature.properties.strokeWidth}
              onChange={(e) => handlePropChange('strokeWidth', parseInt(e.target.value))}
              className="gp-range"
              style={
                {
                  '--gp-range-progress': `${((editingFeature.properties.strokeWidth - 1) / 9) * 100}%`,
                } as React.CSSProperties
              }
              aria-label="线宽粗细"
            />
          </div>

          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePropChange('strokeDasharray', 'solid')}
                className={`py-1.5 rounded-lg border text-center transition ${
                  editingFeature.properties.strokeDasharray !== 'dash'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400'
                }`}
              >
                实线 (Solid)
              </button>
              <button
                type="button"
                onClick={() => handlePropChange('strokeDasharray', 'dash')}
                className={`py-1.5 rounded-lg border text-center transition ${
                  editingFeature.properties.strokeDasharray === 'dash'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-white font-medium'
                    : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-slate-500 dark:text-gray-400'
                }`}
              >
                虚线 (Dash)
              </button>
            </div>
          </div>
        </div>

        {/* 区域填充 */}
        {isPolygonLike && (
          <div className="p-3 bg-slate-50 dark:bg-gray-950 rounded-xl border border-slate-200 dark:border-gray-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-600 dark:text-gray-400 font-medium">区域填充色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editingFeature.properties.fillColor}
                  onChange={(e) => handlePropChange('fillColor', e.target.value)}
                  className="w-11 h-11 p-0 bg-transparent rounded-xl cursor-pointer border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950"
                  aria-label="选择区域填充色"
                />
                <span className="font-mono text-slate-500 dark:text-gray-400">
                  {editingFeature.properties.fillColor}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-slate-600 dark:text-gray-400 mb-1">
                <span>填充不透明度</span>
                <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                  {Math.round(editingFeature.properties.fillOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={editingFeature.properties.fillOpacity}
                onChange={(e) => handlePropChange('fillOpacity', parseFloat(e.target.value))}
                className="gp-range"
                style={
                  {
                    '--gp-range-progress': `${editingFeature.properties.fillOpacity * 100}%`,
                  } as React.CSSProperties
                }
                aria-label="填充不透明度"
              />
            </div>
          </div>
        )}

        {/* 备注说明 */}
        <div>
          <label className="block text-slate-600 dark:text-gray-400 font-medium mb-1 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
            <span>外业调查与地物说明</span>
          </label>
          <textarea
            rows={2}
            value={editingFeature.properties.notes || ''}
            onChange={(e) => handlePropChange('notes', e.target.value)}
            placeholder="填写现场核查记录、规划指标或地物说明..."
            className="w-full px-3 py-2 bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-xl text-slate-800 dark:text-gray-200 resize-none focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* 删除要素 */}
        <div className="pt-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-300 rounded-xl font-medium transition active:scale-95"
          >
            <Trash2 className="w-4 h-4" />
            <span>删除当前 GIS 要素</span>
          </button>
        </div>
      </div>

      {/* 中文定制确认弹窗 */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          onDeleteFeature(feature.id);
          onClose();
        }}
        title="删除要素确认"
        message={`确定删除要素 "${feature.name}" 吗？删除后将从当前图层和地图中完全移除。`}
        confirmText="确定删除"
        cancelText="取消"
        type="danger"
      />
    </MobileBottomSheet>
  );
};
