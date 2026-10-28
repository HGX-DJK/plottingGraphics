import { PlotLayer, PlotFeature } from '../types';

const STORAGE_KEY_LAYERS = 'geoplot_studio_layers_gis_v2';
const STORAGE_KEY_FEATURES = 'geoplot_studio_features_gis_v2';
const STORAGE_KEY_ACTIVE_LAYER = 'geoplot_studio_active_layer_gis_v2';

// 预设地图中心点 (标准 GIS 演练区域: 120.15, 30.28)
export const DEFAULT_MAP_CENTER: [number, number] = [120.15, 30.28];
export const DEFAULT_MAP_ZOOM = 12;

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
  // 1. 城市空间规划多边形 (Polygon)
  {
    id: 'feat-planning-poly',
    name: '高新产业核心孵化地块 A-03',
    type: 'polygon',
    layerId: 'layer-urban-planning',
    coordinates: [
      [120.17, 30.31],
      [120.22, 30.32],
      [120.23, 30.28],
      [120.18, 30.27],
    ],
    properties: {
      strokeColor: '#2563eb',
      strokeWidth: 2,
      strokeDasharray: 'solid',
      fillColor: '#3b82f6',
      fillOpacity: 0.35,
      calculatedArea: 16840000,
      calculatedLength: 17200,
      notes: '规划为一类工业与研发创新用地，容积率 ≤ 2.5',
      customAttributes: {
        '用地性质': 'M1 (创新研发用地)',
        '规划批复号': 'GH-2026-088',
        '权属单位': '高新区规划和自然资源局',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 5,
    updatedAt: Date.now() - 1000 * 3600 * 5,
  },
  // 2. 空间发展推进箭头 (Attack Arrow)
  {
    id: 'feat-development-arrow',
    name: '沿江生态创新带拓展推进轴',
    type: 'attack-arrow',
    layerId: 'layer-urban-planning',
    coordinates: [
      [120.10, 30.24],
      [120.13, 30.25],
      [120.18, 30.28],
    ],
    properties: {
      strokeColor: '#0284c7',
      strokeWidth: 2.5,
      strokeDasharray: 'solid',
      fillColor: '#38bdf8',
      fillOpacity: 0.4,
      notes: '主城向滨江组团空间梯度拓展与产业链接引力轴',
    },
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
  },
  // 3. 交通干线廊道 (Polyline)
  {
    id: 'feat-corridor-line',
    name: '城际轨道交通与主干路网快速通道',
    type: 'polyline',
    layerId: 'layer-infrastructure',
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
      calculatedLength: 9450,
      notes: '设计时速 80km/h，配套综合市政综合管廊',
      customAttributes: {
        '道路等级': '城市主干路 (双向6车道)',
        '竣工年度': '2027预计',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 4,
    updatedAt: Date.now() - 1000 * 3600 * 4,
  },
  // 4. 水质与空气环境自动监测站 (Point-Station)
  {
    id: 'feat-env-station',
    name: '流域水质生态环境监测站 No.02',
    type: 'point-station',
    layerId: 'layer-survey-points',
    coordinates: [[120.21, 30.30]],
    properties: {
      strokeColor: '#1d4ed8',
      strokeWidth: 2,
      fillColor: '#dbeafe',
      fillOpacity: 1,
      text: '生态水质监测站',
      textColor: '#ffffff',
      textSize: 12,
      notes: '具备 COD、高锰酸盐、溶解氧及浊度24小时自动回传',
      customAttributes: {
        '设备型号': 'SZ-RS-2000 Pro',
        '巡检周期': '周检 (每周二)',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 3,
    updatedAt: Date.now() - 1000 * 3600 * 3,
  },
  // 5. 外业测绘调查基准控制点 (Point-Survey)
  {
    id: 'feat-survey-point',
    name: '三等大地坐标高程基准控制点 JZ-08',
    type: 'point-survey',
    layerId: 'layer-survey-points',
    coordinates: [[120.09, 30.235]],
    properties: {
      strokeColor: '#f59e0b',
      strokeWidth: 2,
      fillColor: '#fef3c7',
      fillOpacity: 1,
      text: '基准控制点',
      textColor: '#ffffff',
      textSize: 12,
      notes: '国家 2000 坐标系 CGCS2000 / 1985国家高程基准',
      customAttributes: {
        '平面坐标系': 'CGCS2000 (3度带)',
        '高程 (m)': '48.650',
      },
    },
    createdAt: Date.now() - 1000 * 3600 * 3,
    updatedAt: Date.now() - 1000 * 3600 * 3,
  },
  // 6. 地质灾害与隐患监测点 (Point-Hazard)
  {
    id: 'feat-hazard-point',
    name: '边坡松散地层位移重点监测隐患点',
    type: 'point-hazard',
    layerId: 'layer-survey-points',
    coordinates: [[120.12, 30.22]],
    properties: {
      strokeColor: '#f59e0b',
      strokeWidth: 2,
      fillColor: '#fffbeb',
      fillOpacity: 1,
      text: '地灾隐患点',
      textColor: '#ffffff',
      textSize: 12,
      notes: '雨季加强雨量与深层孔隙水压力监测预警',
    },
    createdAt: Date.now() - 1000 * 3600 * 2,
    updatedAt: Date.now() - 1000 * 3600 * 2,
  },
  // 7. 应急避难集结中心 (Gathering Place)
  {
    id: 'feat-shelter-area',
    name: '市民中心综合应急疏散避难集结所',
    type: 'gathering-place',
    layerId: 'layer-emergency-buffer',
    coordinates: [
      [120.08, 30.23],
      [120.12, 30.22],
      [120.10, 30.25],
    ],
    properties: {
      strokeColor: '#dc2626',
      strokeWidth: 2,
      strokeDasharray: 'solid',
      fillColor: '#ef4444',
      fillOpacity: 0.35,
      notes: '设计容纳疏散避险群众 1.5 万人，配备独立应急水源发电机',
    },
    createdAt: Date.now() - 1000 * 3600 * 2,
    updatedAt: Date.now() - 1000 * 3600 * 2,
  },
  // 8. 气象雷达监测有效覆盖扇面 (Sector)
  {
    id: 'feat-radar-sector',
    name: '多普勒天气雷达对低空降水有效探测扇区',
    type: 'sector',
    layerId: 'layer-emergency-buffer',
    coordinates: [
      [120.21, 30.30],
      [120.14, 30.27],
    ],
    properties: {
      strokeColor: '#b91c1c',
      strokeWidth: 2,
      strokeDasharray: 'dash',
      fillColor: '#f87171',
      fillOpacity: 0.2,
      notes: '对强对流天气、短时强降雨云系进行径向速度跟踪',
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
