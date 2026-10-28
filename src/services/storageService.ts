import { PlotLayer, PlotFeature } from '../types';

const STORAGE_KEY_LAYERS = 'geoplot_studio_layers_v1';
const STORAGE_KEY_FEATURES = 'geoplot_studio_features_v1';
const STORAGE_KEY_ACTIVE_LAYER = 'geoplot_studio_active_layer_v1';

// 预设默认标绘底图中心点 (以某演训水域与陆区为基准: 120.15, 30.28)
export const DEFAULT_MAP_CENTER: [number, number] = [120.15, 30.28];
export const DEFAULT_MAP_ZOOM = 12;

export const INITIAL_LAYERS: PlotLayer[] = [
  {
    id: 'layer-red-assault',
    name: '红方主攻突击方向与集结区',
    color: '#ef4444',
    visible: true,
    locked: false,
    opacity: 0.9,
    description: '包含红方前沿突击箭头、第一第二梯队集结地及指挥前进所',
    createdAt: Date.now() - 1000 * 3600 * 5,
  },
  {
    id: 'layer-blue-defense',
    name: '蓝方防御配系与警戒阵地',
    color: '#3b82f6',
    visible: true,
    locked: false,
    opacity: 0.85,
    description: '外围雷达预警扇面、防御支撑阵地与封锁警戒区',
    createdAt: Date.now() - 1000 * 3600 * 4,
  },
  {
    id: 'layer-rescue-logistics',
    name: '综合勤务与野战医疗保障',
    color: '#10b981',
    visible: true,
    locked: false,
    opacity: 0.9,
    description: '野战救护所、后勤补给走廊及直升机空投集结点',
    createdAt: Date.now() - 1000 * 3600 * 3,
  },
];

export const INITIAL_FEATURES: PlotFeature[] = [
  // 1. 红方突击进攻箭头 (Attack Arrow)
  {
    id: 'feat-red-arrow-1',
    name: '红方第一梯队主攻突击箭头',
    type: 'attack-arrow',
    layerId: 'layer-red-assault',
    coordinates: [
      [120.10, 30.24],
      [120.13, 30.25],
      [120.18, 30.28],
    ],
    properties: {
      strokeColor: '#dc2626',
      strokeWidth: 2,
      strokeDasharray: 'solid',
      fillColor: '#ef4444',
      fillOpacity: 0.5,
      notes: '计划于H时沿3号公路突破蓝方前沿',
    },
    createdAt: Date.now() - 1000 * 3600 * 5,
    updatedAt: Date.now() - 1000 * 3600 * 5,
  },
  // 2. 红方集结地域 (Gathering Place)
  {
    id: 'feat-red-staging-1',
    name: '红方装甲突击集群集结地域',
    type: 'gathering-place',
    layerId: 'layer-red-assault',
    coordinates: [
      [120.08, 30.23],
      [120.12, 30.22],
      [120.10, 30.25],
    ],
    properties: {
      strokeColor: '#b91c1c',
      strokeWidth: 2,
      strokeDasharray: 'solid',
      fillColor: '#f87171',
      fillOpacity: 0.4,
      notes: '重装备展开与伪装隐蔽区',
    },
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
  },
  // 3. 红方指挥所 (Command Post)
  {
    id: 'feat-red-command',
    name: '红方前沿基本指挥所',
    type: 'post-command',
    layerId: 'layer-red-assault',
    coordinates: [[120.09, 30.235]],
    properties: {
      strokeColor: '#ef4444',
      strokeWidth: 2,
      fillColor: '#fee2e2',
      fillOpacity: 1,
      text: '红方基本指',
      textColor: '#ffffff',
      textSize: 13,
      notes: '具备卫星宽带与野战中继能力',
    },
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
  },
  // 4. 蓝方雷达预警扇形 (Sector)
  {
    id: 'feat-blue-radar-sector',
    name: '蓝方3号超视距雷达探测警戒扇区',
    type: 'sector',
    layerId: 'layer-blue-defense',
    coordinates: [
      [120.21, 30.30], // 圆心
      [120.14, 30.27], // 探测方向与距离
    ],
    properties: {
      strokeColor: '#2563eb',
      strokeWidth: 2,
      strokeDasharray: 'dash',
      fillColor: '#3b82f6',
      fillOpacity: 0.25,
      notes: '探测半径约 8.5km，覆盖正面突破空域',
    },
    createdAt: Date.now() - 1000 * 3600 * 3,
    updatedAt: Date.now() - 1000 * 3600 * 3,
  },
  // 5. 蓝方雷达阵地点 (Radar Post)
  {
    id: 'feat-blue-radar-post',
    name: '蓝方预警雷达核心阵地',
    type: 'post-radar',
    layerId: 'layer-blue-defense',
    coordinates: [[120.21, 30.30]],
    properties: {
      strokeColor: '#1d4ed8',
      strokeWidth: 2,
      fillColor: '#dbeafe',
      fillOpacity: 1,
      text: '蓝方雷达1号',
      textColor: '#ffffff',
      textSize: 13,
    },
    createdAt: Date.now() - 1000 * 3600 * 3,
    updatedAt: Date.now() - 1000 * 3600 * 3,
  },
  // 6. 蓝方纵深防御工事多边形 (Polygon)
  {
    id: 'feat-blue-defense-poly',
    name: '蓝方第一道纵深阻击阵地',
    type: 'polygon',
    layerId: 'layer-blue-defense',
    coordinates: [
      [120.17, 30.31],
      [120.22, 30.32],
      [120.23, 30.28],
      [120.18, 30.27],
    ],
    properties: {
      strokeColor: '#1e40af',
      strokeWidth: 2,
      strokeDasharray: 'solid',
      fillColor: '#60a5fa',
      fillOpacity: 0.35,
      notes: '永备与半永备反装甲防御壕网络',
    },
    createdAt: Date.now() - 1000 * 3600 * 2,
    updatedAt: Date.now() - 1000 * 3600 * 2,
  },
  // 7. 医疗救援所 (Rescue Post)
  {
    id: 'feat-rescue-hospital',
    name: '野战第二机动医疗救援站',
    type: 'post-rescue',
    layerId: 'layer-rescue-logistics',
    coordinates: [[120.11, 30.27]],
    properties: {
      strokeColor: '#059669',
      strokeWidth: 2,
      fillColor: '#d1fae5',
      fillOpacity: 1,
      text: '野战医疗站',
      textColor: '#ffffff',
      textSize: 13,
    },
    createdAt: Date.now() - 1000 * 3600 * 2,
    updatedAt: Date.now() - 1000 * 3600 * 2,
  },
  // 8. 后勤补给绿色通道 (Polyline)
  {
    id: 'feat-logistics-line',
    name: '全天候快速应急补给干线',
    type: 'polyline',
    layerId: 'layer-rescue-logistics',
    coordinates: [
      [120.08, 30.28],
      [120.11, 30.27],
      [120.14, 30.26],
      [120.16, 30.25],
    ],
    properties: {
      strokeColor: '#10b981',
      strokeWidth: 4,
      strokeDasharray: 'dash',
      fillColor: '#10b981',
      fillOpacity: 0,
      notes: '保障伤员后送与弹药燃料紧急前运',
    },
    createdAt: Date.now() - 1000 * 3600 * 1,
    updatedAt: Date.now() - 1000 * 3600 * 1,
  },
];

export const storageService = {
  loadLayers(): PlotLayer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LAYERS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load layers', e);
    }
    this.saveLayers(INITIAL_LAYERS);
    return INITIAL_LAYERS;
  },

  saveLayers(layers: PlotLayer[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_LAYERS, JSON.stringify(layers));
    } catch (e) {
      console.error('Failed to save layers', e);
    }
  },

  loadFeatures(): PlotFeature[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_FEATURES);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load features', e);
    }
    this.saveFeatures(INITIAL_FEATURES);
    return INITIAL_FEATURES;
  },

  saveFeatures(features: PlotFeature[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_FEATURES, JSON.stringify(features));
    } catch (e) {
      console.error('Failed to save features', e);
    }
  },

  getActiveLayerId(availableLayers: PlotLayer[]): string {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_LAYER);
    if (saved && availableLayers.some((l) => l.id === saved)) {
      return saved;
    }
    return availableLayers[0]?.id || 'default-layer';
  },

  setActiveLayerId(layerId: string): void {
    localStorage.setItem(STORAGE_KEY_ACTIVE_LAYER, layerId);
  },

  resetToDefault(): { layers: PlotLayer[]; features: PlotFeature[] } {
    localStorage.removeItem(STORAGE_KEY_LAYERS);
    localStorage.removeItem(STORAGE_KEY_FEATURES);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_LAYER);
    this.saveLayers(INITIAL_LAYERS);
    this.saveFeatures(INITIAL_FEATURES);
    this.setActiveLayerId(INITIAL_LAYERS[0].id);
    return { layers: INITIAL_LAYERS, features: INITIAL_FEATURES };
  },
};
