import { PlotLayer, PlotFeature } from '../types';

const STORAGE_KEY_LAYERS = 'geoplot_studio_layers_shanghai_v3';
const STORAGE_KEY_FEATURES = 'geoplot_studio_features_shanghai_v3';
const STORAGE_KEY_ACTIVE_LAYER = 'geoplot_studio_active_layer_shanghai_v3';

// 预设地图中心点 (中国上海市核心区: 人民广场/陆家嘴 121.4737, 31.2304)
export const DEFAULT_MAP_CENTER: [number, number] = [121.4737, 31.2304];
export const DEFAULT_MAP_ZOOM = 12.5;

export const INITIAL_LAYERS: PlotLayer[] = [
  {
    id: 'layer-urban-planning',
    name: '城市空间规划与红线范围 (面图层)',
    color: '#3b82f6',
    visible: true,
    locked: false,
    opacity: 0.85,
    description: '包含规划控制地块、生态红线、重点开发网格及发展推进轴线',
    createdAt: Date.now() - 1000 * 3600 * 5,
  },
  {
    id: 'layer-infrastructure',
    name: '交通路网与基础设施管线 (线图层)',
    color: '#10b981',
    visible: true,
    locked: false,
    opacity: 0.9,
    description: '城市主干交通廊道、市政地下管线及外业勘察巡检轨迹',
    createdAt: Date.now() - 1000 * 3600 * 4,
  },
  {
    id: 'layer-survey-points',
    name: '外业调查与资源监测站位 (点图层)',
    color: '#f59e0b',
    visible: true,
    locked: false,
    opacity: 0.95,
    description: '包含控制测量点、生态水质自动站、地灾隐患预警点及地物注记',
    createdAt: Date.now() - 1000 * 3600 * 3,
  },
  {
    id: 'layer-emergency-buffer',
    name: '应急避难与重点设施防护圈 (区/扇面)',
    color: '#ef4444',
    visible: true,
    locked: false,
    opacity: 0.8,
    description: '应急避难集结点、气象预警监测扇形面及重点设施安全缓冲范围',
    createdAt: Date.now() - 1000 * 3600 * 2,
  },
];

export const INITIAL_FEATURES: PlotFeature[] = [
  // 1. 城市空间规划多边形 (Polygon) - 上海陆家嘴金融贸易示范区
  {
    id: 'feat-planning-poly',
    name: '陆家嘴金融贸易核心示范地块 A-01',
    type: 'polygon',
    layerId: 'layer-urban-planning',
    coordinates: [
      [121.498, 31.242],
      [121.522, 31.245],
      [121.528, 31.228],
      [121.503, 31.225],
    ],
    properties: {
      strokeColor: '#2563eb',
      strokeWidth: 2.5,
      strokeDasharray: 'solid',
      fillColor: '#3b82f6',
      fillOpacity: 0.35,
      calculatedArea: 3820000,
      calculatedLength: 8600,
      notes: '上海陆家嘴金融贸易示范区规划控制地块，综合容积率 ≤ 3.5',
      customAttributes: {
        '用地性质': 'C2 (商业金融用地)',
        '规划批复号': 'SH-PUDONG-2026-001',
        '权属单位': '上海市浦东新区规划和自然资源局',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 5,
    updatedAt: Date.now() - 1000 * 3600 * 5,
  },
  // 2. 空间发展推进轴线 (Attack Arrow) - 黄浦江两岸协同推进轴
  {
    id: 'feat-development-arrow',
    name: '黄浦江两岸核心功能拓展推进轴',
    type: 'attack-arrow',
    layerId: 'layer-urban-planning',
    coordinates: [
      [121.465, 31.198],
      [121.498, 31.235],
      [121.535, 31.265],
    ],
    properties: {
      strokeColor: '#0284c7',
      strokeWidth: 2.5,
      strokeDasharray: 'solid',
      fillColor: '#38bdf8',
      fillOpacity: 0.4,
      notes: '徐汇滨江-外滩陆家嘴-北外滩两岸协同高水平开发推进轴',
    },
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
  },
  // 3. 交通干线廊道 (Polyline) - 延安高架与世纪大道主干廊道
  {
    id: 'feat-corridor-line',
    name: '延安高架与世纪大道快速交通走廊',
    type: 'polyline',
    layerId: 'layer-infrastructure',
    coordinates: [
      [121.435, 31.220],
      [121.472, 31.229],
      [121.505, 31.238],
      [121.545, 31.226],
    ],
    properties: {
      strokeColor: '#10b981',
      strokeWidth: 4,
      strokeDasharray: 'dash',
      fillColor: '#10b981',
      fillOpacity: 0,
      calculatedLength: 11200,
      notes: '东西向越江骨干综合走廊，设计时速 80km/h 配套综合管廊',
      customAttributes: {
        '道路等级': '城市快速路/主干路',
        '管辖单位': '上海市交通委员会',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
  },
  // 4. 水质与空气环境自动监测站 (Point-Station) - 外滩断面
  {
    id: 'feat-env-station',
    name: '黄浦江外滩水文环境自动监测站 No.01',
    type: 'point-station',
    layerId: 'layer-survey-points',
    coordinates: [[121.492, 31.241]],
    properties: {
      strokeColor: '#1d4ed8',
      strokeWidth: 2,
      fillColor: '#dbeafe',
      fillOpacity: 1,
      text: '外滩水质监测站',
      textColor: '#ffffff',
      textSize: 12,
      notes: '外滩防汛墙断面水质指标、水位流量与浊度 24 小时自动回传',
      customAttributes: {
        '设备型号': 'SZ-RS-2000 Pro',
        '巡检周期': '周检 (每周二)',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 3,
    updatedAt: Date.now() - 1000 * 3600 * 3,
  },
  // 5. 外业测绘调查基准控制点 (Point-Survey) - 人民广场原点
  {
    id: 'feat-survey-point',
    name: '上海城市坐标原点与基准控制点 JZ-01',
    type: 'point-survey',
    layerId: 'layer-survey-points',
    coordinates: [[121.4737, 31.2304]],
    properties: {
      strokeColor: '#f59e0b',
      strokeWidth: 2,
      fillColor: '#fef3c7',
      fillOpacity: 1,
      text: '上海基准原点',
      textColor: '#ffffff',
      textSize: 12,
      notes: '上海城市大地坐标基准点，CGCS2000 国家大地坐标系',
      customAttributes: {
        '平面坐标系': 'CGCS2000 / 上海市独立坐标',
        '基准高程 (m)': '4.250',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 3,
    updatedAt: Date.now() - 1000 * 3600 * 3,
  },
  // 6. 地质安全与防汛隐患监控点 (Point-Hazard) - 苏州河口
  {
    id: 'feat-hazard-point',
    name: '苏州河河口老旧防汛岸段重点巡查隐患点',
    type: 'point-hazard',
    layerId: 'layer-survey-points',
    coordinates: [[121.488, 31.245]],
    properties: {
      strokeColor: '#f59e0b',
      strokeWidth: 2,
      fillColor: '#fffbeb',
      fillOpacity: 1,
      text: '苏州河防汛隐患',
      textColor: '#ffffff',
      textSize: 12,
      notes: '汛期潮位顶托与防汛墙结构形变重点监测点',
    },
    createdAt: Date.now() - 1000 * 3600 * 2,
    updatedAt: Date.now() - 1000 * 3600 * 2,
  },
  // 7. 应急避难集结中心 (Gathering Place) - 世纪公园
  {
    id: 'feat-shelter-area',
    name: '浦东世纪公园综合应急疏散避难集结所',
    type: 'gathering-place',
    layerId: 'layer-emergency-buffer',
    coordinates: [
      [121.545, 31.218],
      [121.562, 31.215],
      [121.554, 31.228],
    ],
    properties: {
      strokeColor: '#dc2626',
      strokeWidth: 2,
      strokeDasharray: 'solid',
      fillColor: '#ef4444',
      fillOpacity: 0.35,
      notes: '世纪公园大型公共绿地综合应急避险场所，设计疏散容量 3 万人',
    },
    createdAt: Date.now() - 1000 * 3600 * 2,
    updatedAt: Date.now() - 1000 * 3600 * 2,
  },
  // 8. 气象雷达监测有效覆盖扇面 (Sector) - 浦东低空监测扇区
  {
    id: 'feat-radar-sector',
    name: '多普勒天气雷达对中心城区低空有效探测扇区',
    type: 'sector',
    layerId: 'layer-emergency-buffer',
    coordinates: [
      [121.530, 31.235],
      [121.460, 31.210],
    ],
    properties: {
      strokeColor: '#b91c1c',
      strokeWidth: 2,
      strokeDasharray: 'dash',
      fillColor: '#f87171',
      fillOpacity: 0.2,
      notes: '对强对流天气、台风降水云团进行中心城区径向速度连续跟踪',
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

  getActiveLayerId(layers: PlotLayer[]): string {
    const saved = localStorage.getItem(STORAGE_KEY_ACTIVE_LAYER);
    if (saved && layers.some((l) => l.id === saved)) {
      return saved;
    }
    return layers.length > 0 ? layers[0].id : '';
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
    return {
      layers: INITIAL_LAYERS,
      features: INITIAL_FEATURES,
    };
  },
};
