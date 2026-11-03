import { BasemapType } from '../../../types';

/**
 * 构造高画质、免 API Key、零水印的纯净 GIS 底图图层 (已移除地图标记与地名/道路注记覆盖层)
 * - satellite: ArcGIS 全球高清遥感正射影像 (纯影像，无边界标记注记)
 * - street: Esri World Street Map 现代高清街区图
 * - dark: Esri 极夜深灰底图 (纯净深灰 Base 基底，无文字注记)
 */
export function createBaseMapLayer(maptalks: any, basemap: BasemapType) {
  const ts = Date.now();

  if (basemap === 'satellite') {
    return new maptalks.TileLayer('base-satellite-' + ts, {
      urlTemplate:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      crossOrigin: 'anonymous',
      repeatWorld: true,
      maxAvailableZoom: 19,
      attribution: '&copy; Esri World Imagery & MapTalks GL',
    });
  }

  if (basemap === 'street') {
    return new maptalks.TileLayer('base-street-' + ts, {
      urlTemplate:
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      crossOrigin: 'anonymous',
      repeatWorld: true,
      maxAvailableZoom: 19,
      attribution: '&copy; Esri World Street Map & MapTalks GL',
    });
  }

  // 默认暗夜科技 (dark): Esri 纯净极夜深灰底图 (已移除 Reference 文字标记注记)
  return new maptalks.TileLayer('base-dark-' + ts, {
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    crossOrigin: 'anonymous',
    repeatWorld: true,
    maxAvailableZoom: 19,
    attribution: '&copy; Esri Dark Canvas & MapTalks GL',
  });
}
