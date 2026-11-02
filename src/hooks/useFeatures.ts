import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PlotFeature, PlotLayer } from '../types';
import { storageService } from '../services/storageService';

interface UseFeaturesOptions {
  onNotify?: (message: string, action?: { label: string; onClick: () => void }) => void;
  layers: PlotLayer[];
  onEnsureLayerVisible?: (layerId: string) => void;
  onSelectActiveLayer?: (layerId: string) => void;
}

export function useFeatures(options: UseFeaturesOptions) {
  const { onNotify, layers, onEnsureLayerVisible, onSelectActiveLayer } = options;

  const [features, setFeatures] = useState<PlotFeature[]>(() =>
    storageService.loadFeatures()
  );
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  /**
   * 用 ref 持有最新的要素表与选中态。
   *
   * 目的：让下面几个回调不再依赖 features / selectedFeatureId，
   * 从而在「仅选中态变化」「仅要素增删」时保持引用稳定。
   * 否则 handleDeleteFeature 会因 selectedFeatureId 变化而换引用，
   * 传给 React.memo 包裹的 MobileLayerSheet / MobileFeatureListSheet /
   * MobilePropertySheet 后浅比较必然失败，三个抽屉会被无谓地整体重渲染。
   */
  const featuresRef = useRef(features);
  featuresRef.current = features;
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  selectedFeatureIdRef.current = selectedFeatureId;
  const selectedFeatureRef = useRef<PlotFeature | null>(null);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  // 自动持久化
  useEffect(() => {
    storageService.saveFeatures(features);
  }, [features]);

  const selectedFeature = useMemo(() => {
    return features.find((f) => f.id === selectedFeatureId) || null;
  }, [features, selectedFeatureId]);

  selectedFeatureRef.current = selectedFeature;

  // 新建要素
  const handleCreateFeature = useCallback(
    (featureData: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => {
      // 确保所属图层处于可见状态
      onEnsureLayerVisible?.(featureData.layerId);

      const targetLayer = layersRef.current.find((l) => l.id === featureData.layerId);
      const newFeature: PlotFeature = {
        ...featureData,
        id: `feat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setFeatures((prev) => [...prev, newFeature]);
      setSelectedFeatureId(newFeature.id);
      onNotify?.(`✓ 已在「${targetLayer?.name || '指定图层'}」中创建要素 "${newFeature.name}"`);
      return newFeature;
    },
    [onEnsureLayerVisible, onNotify]
  );

  // 更新要素
  const handleUpdateFeature = useCallback((updated: PlotFeature) => {
    setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  // 删除要素 (带撤销入口)
  const handleDeleteFeature = useCallback(
    (featureId: string) => {
      const target = featuresRef.current.find((f) => f.id === featureId);
      if (!target) return;
      setFeatures((prev) => prev.filter((f) => f.id !== featureId));
      if (selectedFeatureIdRef.current === featureId) {
        setSelectedFeatureId(null);
      }
      onNotify?.(`✓ 已删除要素 "${target.name}"`, {
        label: '撤销',
        onClick: () => {
          setFeatures((prev) =>
            prev.some((f) => f.id === target.id) ? prev : [...prev, target]
          );
          onNotify?.(`↩ 已恢复要素 "${target.name}"`);
        },
      });
    },
    [onNotify]
  );

  // 清空要素 (全部或指定图层)
  const handleClearFeatures = useCallback(
    (layerId?: string) => {
      if (layerId) {
        setFeatures((prev) => prev.filter((f) => f.layerId !== layerId));
        const selected = selectedFeatureRef.current;
        if (selected && selected.layerId === layerId) {
          setSelectedFeatureId(null);
        }
        onNotify?.('✓ 指定图层要素已清空');
      } else {
        setFeatures([]);
        setSelectedFeatureId(null);
        onNotify?.('✓ 所有图层要素已全部清空');
      }
    },
    [onNotify]
  );

  // 按图层级联删除要素
  const handleCascadeDeleteByLayer = useCallback((layerId: string) => {
    setFeatures((prev) => prev.filter((f) => f.layerId !== layerId));
    // 选中的要素若随图层被级联删除，必须清空选中态。
    // 否则 selectedFeatureId 会指向一个已不存在的要素：
    // selectedFeature 解析为 null，但底栏 hasSelectedFeature 仍为 true，UI 状态自相矛盾。
    setSelectedFeatureId((prev) =>
      prev && featuresRef.current.find((f) => f.id === prev && f.layerId === layerId) ? null : prev
    );
  }, []);

  // 精准定位与聚焦要素
  const handleLocateFeature = useCallback(
    (
      featureId: string,
      onFocusMap?: (feat: PlotFeature) => void,
      onCloseModals?: () => void
    ) => {
      const feat = featuresRef.current.find((f) => f.id === featureId);
      if (!feat) return;

      // 1. 确保该要素所属图层可见，并切换激活该图层
      onEnsureLayerVisible?.(feat.layerId);
      onSelectActiveLayer?.(feat.layerId);

      // 2. 选中该要素
      setSelectedFeatureId(featureId);

      // 3. 收起所有抽屉/面板
      onCloseModals?.();

      // 4. 调用地图飞行聚焦
      onFocusMap?.(feat);

      onNotify?.(`📍 已在地图中精准定位: ${feat.name}`);
    },
    [onEnsureLayerVisible, onSelectActiveLayer, onNotify]
  );

  // 批量重置/替换要素
  const resetFeatures = useCallback((newFeatures: PlotFeature[]) => {
    setFeatures(newFeatures);
    setSelectedFeatureId(null);
  }, []);

  return {
    features,
    setFeatures,
    selectedFeatureId,
    setSelectedFeatureId,
    selectedFeature,
    handleCreateFeature,
    handleUpdateFeature,
    handleDeleteFeature,
    handleClearFeatures,
    handleCascadeDeleteByLayer,
    handleLocateFeature,
    resetFeatures,
  };
}
