import { PlotFeature, PlotLayer } from '../types';
import { gcj02towgs84, calculateSphericalDistance } from '../utils/geoUtils';

export interface AmapPoiItem {
  id: string;
  name: string;
  address: string;
  location: [number, number]; // WGS-84 标准经纬度 [lng, lat]
  gcjLocation?: [number, number]; // 原始火星经纬度
  type?: string;
  district?: string;
  city?: string;
  province?: string;
  distance?: number; // 距离参考中心点的直线距离 (米)
  source: 'amap' | 'local';
}

const STORAGE_KEY_AMAP_KEY = 'geoplot_amap_web_key';
const STORAGE_KEY_SEARCH_HISTORY = 'geoplot_poi_search_history';

// 预设的高德开放平台 Web 服务 Key 备选池 (免去用户初次使用的配置成本)
const DEFAULT_AMAP_KEYS = [
  '7df9a0f023e1dc2850f8373b9e436814',
  '24c96a8470a6c6d048dc0604473dfb42',
  '23a2688002df2f84b3e8c0db1490226d',
];

class AmapSearchService {
  /**
   * 获取当前生效的高德 Web 服务 Key (优先使用用户自定义 Key)
   */
  getApiKey(): string {
    const customKey = localStorage.getItem(STORAGE_KEY_AMAP_KEY);
    if (customKey && customKey.trim().length > 10) {
      return customKey.trim();
    }
    return DEFAULT_AMAP_KEYS[0];
  }

  /**
   * 保存用户自定义的高德 Key
   */
  setCustomApiKey(key: string): void {
    if (!key || !key.trim()) {
      localStorage.removeItem(STORAGE_KEY_AMAP_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY_AMAP_KEY, key.trim());
    }
  }

  /**
   * 获取用户自定义 Key (若未设置则返回空字符串)
   */
  getCustomApiKey(): string {
    return localStorage.getItem(STORAGE_KEY_AMAP_KEY) || '';
  }

  /**
   * 高德全国 POI 关键词检索 (调用 place/text 接口)
   * @param keyword 搜索关键字 (如: 人民广场, 杭州西湖, 广深港高铁)
   * @param city 城市限定 (可选，如: 全国, 上海, 北京)
   * @param referenceCoord 用于计算距离的参考坐标 (如当前地图中心或 GPS 点)
   */
  async searchPoi(
    keyword: string,
    city?: string,
    referenceCoord?: [number, number]
  ): Promise<{ pois: AmapPoiItem[]; error?: string }> {
    const query = keyword.trim();
    if (!query) {
      return { pois: [] };
    }

    const key = this.getApiKey();
    const cityParam = city && city !== '全国' ? `&city=${encodeURIComponent(city)}` : '';
    const url = `https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(
      query
    )}${cityParam}&offset=20&page=1&extensions=all&key=${key}`;

    try {
      const resp = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!resp.ok) {
        throw new Error(`HTTP Error: ${resp.status}`);
      }

      const data = await resp.json();

      if (data.status !== '1') {
        const errorMsg = data.info || '高德接口返回异常';
        return { pois: [], error: errorMsg };
      }

      const rawPois: any[] = data.pois || [];
      const results: AmapPoiItem[] = [];

      for (const item of rawPois) {
        if (!item.location || typeof item.location !== 'string') continue;

        const parts = item.location.split(',');
        if (parts.length < 2) continue;

        const gcjLng = parseFloat(parts[0]);
        const gcjLat = parseFloat(parts[1]);
        if (isNaN(gcjLng) || isNaN(gcjLat)) continue;

        // 火星坐标 (GCJ-02) 转换为 WGS-84 标准经纬度
        const [wgsLng, wgsLat] = gcj02towgs84(gcjLng, gcjLat);

        // 计算距离参考点的球面距离
        let distance: number | undefined;
        if (referenceCoord) {
          distance = calculateSphericalDistance(referenceCoord, [wgsLng, wgsLat]);
        }

        results.push({
          id: item.id || `amap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: item.name || query,
          address: typeof item.address === 'string' && item.address.length > 0 ? item.address : `${item.pname || ''}${item.cityname || ''}${item.adname || ''}`,
          location: [wgsLng, wgsLat],
          gcjLocation: [gcjLng, gcjLat],
          type: item.type || '',
          province: item.pname || '',
          city: item.cityname || '',
          district: item.adname || '',
          distance,
          source: 'amap',
        });
      }

      // 如果有输入提示的备选输入 (当 POI 为空时自动降级尝试输入提示)
      if (results.length === 0) {
        const fallbackTips = await this.inputTips(query, city, referenceCoord);
        if (fallbackTips.length > 0) {
          return { pois: fallbackTips };
        }
      }

      return { pois: results };
    } catch (err: any) {
      console.warn('Amap POI search failed:', err);
      return { pois: [], error: err.message || '网络连接异常或接口受限' };
    }
  }

  /**
   * 高德输入实时提示 (InputTips 自动补全)
   */
  async inputTips(
    keyword: string,
    city?: string,
    referenceCoord?: [number, number]
  ): Promise<AmapPoiItem[]> {
    const query = keyword.trim();
    if (!query) return [];

    const key = this.getApiKey();
    const cityParam = city && city !== '全国' ? `&city=${encodeURIComponent(city)}` : '';
    const url = `https://restapi.amap.com/v3/assistant/inputtips?keywords=${encodeURIComponent(
      query
    )}${cityParam}&datatype=all&key=${key}`;

    try {
      const resp = await fetch(url, { method: 'GET', mode: 'cors' });
      if (!resp.ok) return [];
      const data = await resp.json();
      if (data.status !== '1' || !Array.isArray(data.tips)) return [];

      const results: AmapPoiItem[] = [];

      for (const tip of data.tips) {
        if (!tip.location || typeof tip.location !== 'string') continue;
        const parts = tip.location.split(',');
        if (parts.length < 2) continue;

        const gcjLng = parseFloat(parts[0]);
        const gcjLat = parseFloat(parts[1]);
        if (isNaN(gcjLng) || isNaN(gcjLat)) continue;

        const [wgsLng, wgsLat] = gcj02towgs84(gcjLng, gcjLat);

        let distance: number | undefined;
        if (referenceCoord) {
          distance = calculateSphericalDistance(referenceCoord, [wgsLng, wgsLat]);
        }

        results.push({
          id: tip.id || `amap-tip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: tip.name,
          address: typeof tip.address === 'string' && tip.address.length > 0 ? tip.address : tip.district || '',
          location: [wgsLng, wgsLat],
          gcjLocation: [gcjLng, gcjLat],
          type: tip.typecode || '',
          district: tip.district || '',
          distance,
          source: 'amap',
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * 本地已标绘要素匹配检索 (混合搜索支撑断网可用)
   */
  searchLocalFeatures(
    keyword: string,
    features: PlotFeature[],
    layers: PlotLayer[],
    referenceCoord?: [number, number]
  ): AmapPoiItem[] {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];

    const matched = features.filter((feat) => {
      const matchName = feat.name.toLowerCase().includes(q);
      const matchNotes = feat.properties.notes?.toLowerCase().includes(q);
      const matchLayer = layers.find((l) => l.id === feat.layerId)?.name.toLowerCase().includes(q);
      return matchName || matchNotes || matchLayer;
    });

    return matched.map((feat) => {
      const firstCoord: [number, number] = feat.coordinates[0] || [121.4737, 31.2304];
      const layer = layers.find((l) => l.id === feat.layerId);

      let distance: number | undefined;
      if (referenceCoord) {
        distance = calculateSphericalDistance(referenceCoord, firstCoord);
      }

      return {
        id: `local-${feat.id}`,
        name: feat.name,
        address: `【本地图层: ${layer?.name || '默认'}】${feat.properties.notes || '无附加描述'}`,
        location: firstCoord,
        type: `标绘要素 (${feat.type})`,
        district: '本地工作图层',
        distance,
        source: 'local',
      };
    });
  }

  /**
   * 搜索历史管理
   */
  getSearchHistory(): AmapPoiItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SEARCH_HISTORY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }

  addSearchHistory(item: AmapPoiItem): void {
    try {
      const history = this.getSearchHistory().filter((h) => h.name !== item.name);
      history.unshift({
        id: item.id,
        name: item.name,
        address: item.address,
        location: item.location,
        district: item.district,
        type: item.type,
        source: item.source,
      });
      // 保留最近 10 条
      const sliced = history.slice(0, 10);
      localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(sliced));
    } catch (e) {
      console.warn('Failed to save search history:', e);
    }
  }

  removeSearchHistory(name: string): void {
    try {
      const history = this.getSearchHistory().filter((h) => h.name !== name);
      localStorage.setItem(STORAGE_KEY_SEARCH_HISTORY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to remove search history:', e);
    }
  }

  clearSearchHistory(): void {
    localStorage.removeItem(STORAGE_KEY_SEARCH_HISTORY);
  }
}

export const amapSearchService = new AmapSearchService();
