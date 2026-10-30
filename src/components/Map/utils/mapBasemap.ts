import { BasemapType } from '../../../types';

/**
 * 构造高画质、免 API Key、零水印的生产级 GIS 底图图层
 * - dark: Esri 极夜深灰底图 (Dark Base + Dark Reference 透明道路注记)
 * - satellite: ArcGIS 全球高清遥感正射影像 + 边界道路地名注记
 * - street: Esri World Street Map 现代高清街道图 (全路网、水系、地标建筑)
 */
export function createBaseMapLayer(maptalks: any, basemap: BasemapType) {
  const ts = Date.now();

  if (basemap === 'satellite') {
    if (maptalks.GroupTileLayer) {
      return new maptalks.GroupTileLayer('base-satellite-' + ts, [
        new maptalks.TileLayer('sat-img-' + ts, {
          urlTemplate:
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          crossOrigin: 'anonymous',
          repeatWorld: true,
          maxAvailableZoom: 19,
          attribution: '&copy; Esri World Imagery & MapTalks GL',
        }),
        new maptalks.TileLayer('sat-ref-' + ts, {
          urlTemplate:
            'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          crossOrigin: 'anonymous',
          repeatWorld: true,
          maxAvailableZoom: 19,
        }),
      ]);
    }
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

  // 默认暗夜科技 (dark): Esri 极夜深灰底图 + 透明道路注记
  if (maptalks.GroupTileLayer) {
    return new maptalks.GroupTileLayer('base-dark-' + ts, [
      new maptalks.TileLayer('dark-base-' + ts, {
        urlTemplate:
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        crossOrigin: 'anonymous',
        repeatWorld: true,
        maxAvailableZoom: 19,
        attribution: '&copy; Esri Dark Canvas & MapTalks GL',
      }),
      new maptalks.TileLayer('dark-ref-' + ts, {
        urlTemplate:
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        crossOrigin: 'anonymous',
        repeatWorld: true,
        maxAvailableZoom: 19,
      }),
    ]);
  }

  return new maptalks.TileLayer('base-dark-' + ts, {
    urlTemplate:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    crossOrigin: 'anonymous',
    repeatWorld: true,
    maxAvailableZoom: 19,
    attribution: '&copy; Esri Dark Canvas & MapTalks GL',
  });
}
