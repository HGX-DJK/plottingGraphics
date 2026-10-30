import { useState, useEffect, useMemo, useCallback } from 'react';
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

  // 自动持久化
  useEffect(() => {
    storageService.saveFeatures(features);
  }, [features]);

  const selectedFeature = useMemo(() => {
    return features.find((f) => f.id === selectedFeatureId) || null;
  }, [features, selectedFeatureId]);

  // 新建要素
  const handleCreateFeature = useCallback(
    (featureData: Omit<PlotFeature, 'id' | 'createdAt' | 'updatedAt'>) => {
      // 确保所属图层处于可见状态
      onEnsureLayerVisible?.(featureData.layerId);

      const targetLayer = layers.find((l) => l.id === featureData.layerId);
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
    [layers, onEnsureLayerVisible, onNotify]
  );

  // 更新要素
  const handleUpdateFeature = useCallback((updated: PlotFeature) => {
    setFeatures((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  // 删除要素 (带撤销入口)
  const handleDeleteFeature = useCallback(
    (featureId: string) => {
      const target = features.find((f) => f.id === featureId);
      if (!target) return;
      setFeatures((prev) => prev.filter((f) => f.id !== featureId));
      if (selectedFeatureId === featureId) {
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
    [features, selectedFeatureId, onNotify]
  );

  // 清空要素 (全部或指定图层)
  const handleClearFeatures = useCallback(
    (layerId?: string) => {
      if (layerId) {
        setFeatures((prev) => prev.filter((f) => f.layerId !== layerId));
        if (selectedFeature && selectedFeature.layerId === layerId) {
          setSelectedFeatureId(null);
        }
        onNotify?.('✓ 指定图层要素已清空');
      } else {
        setFeatures([]);
        setSelectedFeatureId(null);
        onNotify?.('✓ 所有图层要素已全部清空');
      }
    },
    [selectedFeature, onNotify]
  );

  // 按图层级联删除要素
  const handleCascadeDeleteByLayer = useCallback((layerId: string) => {
    setFeatures((prev) => prev.filter((f) => f.layerId !== layerId));
    setSelectedFeatureId((prev) => {
      // 如果当前选中的要素属于被删除的图层，重置选中态
      return prev;
    });
  }, []);

  // 精准定位与聚焦要素
  const handleLocateFeature = useCallback(
    (
      featureId: string,
      onFocusMap?: (feat: PlotFeature) => void,
      onCloseModals?: () => void
    ) => {
      const feat = features.find((f) => f.id === featureId);
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
    [features, onEnsureLayerVisible, onSelectActiveLayer, onNotify]
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
