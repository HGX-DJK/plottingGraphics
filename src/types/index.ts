export type UserRole = 'admin' | 'surveyor' | 'analyst';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  roleName: string;
  avatar: string;
}

export type PlotFeatureType =
  // 1. 基础空间几何矢量 (GIS 核心)
  | 'marker'            // 通用地理位置点
  | 'text'              // 空间文字注记
  | 'polyline'          // 折线 / 路径 / 边界线
  | 'polygon'           // 多边形 / 用地面 / 调查区
  | 'rectangle'         // 矩形 / 范围框 (BBox)
  | 'circle'            // 圆形 / 缓冲区 (Buffer)
  | 'freehand'          // 自由手绘轨迹线
  // 2. 专题地物与调查点标 (GIS 外业采集)
  | 'point-survey'      // 外业调查核查点
  | 'point-station'     // 环境/气象/地灾监测站
  | 'point-facility'    // 公共服务与基础设施
  | 'point-hazard'      // 风险隐患/灾害警示点
  | 'point-medical'     // 医疗卫生/应急避难点
  // 3. 态势与方向标绘 (工程推进/流向/影响范围)
  | 'straight-arrow'    // 单向指示箭头
  | 'attack-arrow'      // 发展轴线 / 规划推进箭头
  | 'pincer-arrow'      // 双向汇聚 / 分流箭头
  | 'gathering-place'   // 核心集结 / 重点管控闭合区
  | 'sector';           // 扇形探测 / 影响范围区

export interface PlotFeatureProperties {
  strokeColor: string;
  strokeWidth: number;
  strokeDasharray?: string; // 'solid' | 'dash' | 'dot'
  fillColor: string;
  fillOpacity: number;
  text?: string;
  textColor?: string;
  textSize?: number;
  radius?: number;          // meters for circle
  notes?: string;
  // 空间几何指标 (由算法自动计算生成)
  calculatedArea?: number;      // 面积 (平方米)
  calculatedLength?: number;    // 长度/周长 (米)
  // GIS 自定义扩展业务属性 (键值对)
  customAttributes?: Record<string, string>;
}

export interface PlotFeature {
  id: string;
  name: string;
  type: PlotFeatureType;
  layerId: string;
  coordinates: [number, number][]; // [lng, lat][] (MapTalks 标准经度、纬度)
  properties: PlotFeatureProperties;
  createdAt: number;
  updatedAt: number;
}

export interface PlotLayer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  description?: string;
  createdAt: number;
}

export type BasemapType = 'dark' | 'satellite' | 'street' | 'grid';

export interface MapViewState {
  center: [number, number]; // [lng, lat]
  zoom: number;
}
