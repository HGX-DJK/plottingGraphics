import { useState, useEffect, useMemo, useCallback } from 'react';
import { PlotLayer } from '../types';
import { storageService } from '../services/storageService';

interface UseLayersOptions {
  onNotify?: (message: string) => void;
  onCascadeDeleteFeatures?: (layerId: string) => void;
}

export function useLayers(options?: UseLayersOptions) {
  const { onNotify, onCascadeDeleteFeatures } = options || {};

  const [layers, setLayers] = useState<PlotLayer[]>(() => storageService.loadLayers());
  const [activeLayerId, setActiveLayerId] = useState<string>(() =>
    storageService.getActiveLayerId(layers)
  );

  // 自动持久化
  useEffect(() => {
    storageService.saveLayers(layers);
  }, [layers]);

  useEffect(() => {
    storageService.setActiveLayerId(activeLayerId);
  }, [activeLayerId]);

  const activeLayer = useMemo(() => {
    return layers.find((l) => l.id === activeLayerId) || layers[0] || null;
  }, [layers, activeLayerId]);

  // 切换激活工作图层：仅显示该图层下要素，自动隐藏其他图层要素
  const handleSelectActiveLayer = useCallback(
    (layerId: string) => {
      setActiveLayerId(layerId);
      setLayers((prev) => {
        const target = prev.find((l) => l.id === layerId);
        if (target && onNotify) {
          onNotify(`已切换至「${target.name}」，地图仅显示该图层要素`);
        }
        return prev.map((l) => ({
          ...l,
          visible: l.id === layerId,
        }));
      });
    },
    [onNotify]
  );

  // 快捷视图范围控制：仅显示当前工作图层 vs 显示全图层
  const handleShowOnlyActiveLayer = useCallback(() => {
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: l.id === activeLayerId,
      }))
    );
    onNotify?.('已切换为仅显示当前图层要素');
  }, [activeLayerId, onNotify]);

  const handleShowAllLayers = useCallback(() => {
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        visible: true,
      }))
    );
    onNotify?.('已显示全部图层要素');
  }, [onNotify]);

  // 创建新图层
  const handleCreateLayer = useCallback(
    (newLayerData: Omit<PlotLayer, 'id' | 'createdAt'>) => {
      const newLayer: PlotLayer = {
        ...newLayerData,
        id: `layer-${Date.now()}`,
        createdAt: Date.now(),
        visible: true,
      };
      // 新建图层并设为当前显示图层，其余图层自动隐藏
      setLayers((prev) => [
        ...prev.map((l) => ({ ...l, visible: false })),
        newLayer,
      ]);
      setActiveLayerId(newLayer.id);
      onNotify?.(`✓ 已新建并切换至「${newLayer.name}」，地图仅显示该图层要素`);
      return newLayer;
    },
    [onNotify]
  );

  // 切换图层显隐
  const handleToggleLayerVisibility = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  }, []);

  // 切换图层锁定
  const handleToggleLayerLock = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l))
    );
  }, []);

  // 修改图层透明度
  const handleChangeLayerOpacity = useCallback((layerId: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, opacity } : l))
    );
  }, []);

  // 删除图层
  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      if (layers.length <= 1) {
        onNotify?.('至少需要保留一个图层，无法删除当前唯一图层');
        return;
      }
      const updated = layers.filter((l) => l.id !== layerId);
      setLayers(updated);
      onCascadeDeleteFeatures?.(layerId);
      if (activeLayerId === layerId && updated.length > 0) {
        handleSelectActiveLayer(updated[0].id);
      }
    },
    [layers, activeLayerId, onNotify, onCascadeDeleteFeatures, handleSelectActiveLayer]
  );

  // 确保指定图层可见 (例如绘制/定位要素时)
  const ensureLayerVisible = useCallback((layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId && !l.visible ? { ...l, visible: true } : l))
    );
  }, []);

  // 批量替换/重置
  const resetLayers = useCallback((newLayers: PlotLayer[], defaultActiveId?: string) => {
    setLayers(newLayers);
    if (defaultActiveId) {
      setActiveLayerId(defaultActiveId);
    } else if (newLayers.length > 0) {
      setActiveLayerId(newLayers[0].id);
    }
  }, []);

  return {
    layers,
    setLayers,
    activeLayerId,
    setActiveLayerId,
    activeLayer,
    handleSelectActiveLayer,
    handleShowOnlyActiveLayer,
    handleShowAllLayers,
    handleCreateLayer,
    handleToggleLayerVisibility,
    handleToggleLayerLock,
    handleChangeLayerOpacity,
    handleDeleteLayer,
    ensureLayerVisible,
    resetLayers,
  };
}
