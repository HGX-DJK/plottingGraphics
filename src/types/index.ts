export type UserRole = 'admin' | 'analyst' | 'operator';

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  roleName: string;
  avatar: string;
}

export type PlotFeatureType =
  // 基础标绘
  | 'marker'            // 战术标号点
  | 'text'              // 文字注记
  | 'polyline'          // 折线/路线
  | 'polygon'           // 多边形/防区
  | 'rectangle'         // 矩形搜索区
  | 'circle'            // 圆形警戒区
  | 'freehand'          // 自由折线手绘
  // 战术态势标绘
  | 'straight-arrow'    // 直箭头 / 进攻方向
  | 'attack-arrow'      // 突击箭头 / 粗进攻箭头
  | 'pincer-arrow'      // 钳击双箭头
  | 'gathering-place'   // 集结地域
  | 'sector'            // 警戒扇形
  // 战术图标标号
  | 'post-command'      // 指挥部
  | 'post-radar'        // 雷达站
  | 'post-danger'       // 威胁/危险源
  | 'post-rescue'       // 医疗救援点
  | 'post-airport'      // 战术机场
  | 'post-depot';       // 物资仓库

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
  iconSymbol?: string;
  notes?: string;
}

export interface PlotFeature {
  id: string;
  name: string;
  type: PlotFeatureType;
  layerId: string;
  coordinates: [number, number][]; // [lng, lat][] (MapTalks 经度、纬度标准顺序)
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
