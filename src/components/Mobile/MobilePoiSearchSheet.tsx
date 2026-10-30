import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  MapPin,
  Navigation,
  Compass,
  History,
  Trash2,
  Key,
  ExternalLink,
  PlusCircle,
  Copy,
  Building2,
  TreePine,
  Layers,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import {
  amapSearchService,
  AmapPoiItem,
} from '../../services/amapSearchService';
import { PlotFeature, PlotLayer } from '../../types';
import { formatDistance, formatCoordinates } from '../../utils/geoUtils';
import { copyToClipboard } from '../../utils/uiUtils';

interface MobilePoiSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentCenter: [number, number];
  userGpsCoord?: [number, number] | null;
  activeLayer: PlotLayer | undefined;
  features: PlotFeature[];
  layers: PlotLayer[];
  onSelectLocation: (coord: [number, number], title: string, subtitle: string) => void;
  onSaveAsFeature?: (poi: AmapPoiItem) => void;
  onNotify?: (msg: string) => void;
}

// 热门/推荐地标快捷检索词
const POPULAR_PRESETS = [
  { name: '人民广场', city: '上海' },
  { name: '陆家嘴', city: '上海' },
  { name: '外滩', city: '上海' },
  { name: '东方明珠', city: '上海' },
  { name: '天安门广场', city: '北京' },
  { name: '杭州西湖', city: '杭州' },
  { name: '深圳湾公园', city: '深圳' },
  { name: '广州塔', city: '广州' },
];

export const MobilePoiSearchSheet: React.FC<MobilePoiSearchSheetProps> = ({
  isOpen,
  onClose,
  currentCenter,
  userGpsCoord,
  activeLayer,
  features,
  layers,
  onSelectLocation,
  onSaveAsFeature,
  onNotify,
}) => {
  const [keyword, setKeyword] = useState('');
  const [cityFilter, setCityFilter] = useState('全国');
  const [isLoading, setIsLoading] = useState(false);
  const [pois, setPois] = useState<AmapPoiItem[]>([]);
  const [localMatches, setLocalMatches] = useState<AmapPoiItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<AmapPoiItem[]>([]);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);

  // 坐标参考基准点 (优先使用 GPS，其次使用地图中心)
  const referenceCoord = userGpsCoord || currentCenter;

  // 打开时加载历史与自动对焦
  useEffect(() => {
    if (isOpen) {
      setSearchHistory(amapSearchService.getSearchHistory());
      setCustomKeyInput(amapSearchService.getCustomApiKey());
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // 执行搜索
  const executeSearch = async (query: string, city: string) => {
    const q = query.trim();
    if (!q) {
      setPois([]);
      setLocalMatches([]);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // 1. 同时检索本地已标绘要素
    const matchedLocal = amapSearchService.searchLocalFeatures(
      q,
      features,
      layers,
      referenceCoord
    );
    setLocalMatches(matchedLocal);

    // 2. 调用高德全国 POI 接口
    const { pois: amapResults, error } = await amapSearchService.searchPoi(
      q,
      city,
      referenceCoord
    );

    if (error) {
      setErrorMessage(error);
    }

    // 按距离升序辅助排序
    const sorted = [...amapResults].sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    setPois(sorted);
    setIsLoading(false);
  };

  // 监听输入并防抖 350ms 自动搜索
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setKeyword(val);

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current);
    }

    if (!val.trim()) {
      setPois([]);
      setLocalMatches([]);
      setErrorMessage(null);
      return;
    }

    searchTimerRef.current = window.setTimeout(() => {
      executeSearch(val, cityFilter);
    }, 350);
  };

  // 点击选择地点 (定位飞跃)
  const handleSelectPoi = (item: AmapPoiItem) => {
    amapSearchService.addSearchHistory(item);
    setSearchHistory(amapSearchService.getSearchHistory());
    onSelectLocation(item.location, item.name, item.address);
    onClose();
  };

  // 点击快捷词
  const handlePresetClick = (preset: { name: string; city: string }) => {
    setKeyword(preset.name);
    executeSearch(preset.name, preset.city);
  };

  // 一键将搜索点存为标绘要素
  const handleSaveAsPlotFeature = (item: AmapPoiItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSaveAsFeature) {
      onSaveAsFeature(item);
      amapSearchService.addSearchHistory(item);
      setSearchHistory(amapSearchService.getSearchHistory());
      onNotify?.(`📍 已将「${item.name}」存为要素至当前图层`);
    }
  };

  // 复制经纬度
  const handleCopyCoord = (item: AmapPoiItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${item.location[0].toFixed(6)}, ${item.location[1].toFixed(6)}`;
    copyToClipboard(text);
    setCopiedId(item.id);
    onNotify?.(`📋 已复制坐标: ${text}`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // 清空历史
  const handleClearHistory = () => {
    amapSearchService.clearSearchHistory();
    setSearchHistory([]);
    onNotify?.('已清空搜索历史');
  };

  // 保存自定义 Key
  const handleSaveKey = () => {
    amapSearchService.setCustomApiKey(customKeyInput);
    setShowKeyConfig(false);
    onNotify?.(customKeyInput.trim() ? '已更新高德 Web 服务 Key' : '已恢复默认高德 Key');
    if (keyword.trim()) {
      executeSearch(keyword, cityFilter);
    }
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="全国地名/地址检索"
      icon={<Search className="w-5 h-5 text-blue-500" />}
      heightClass="max-h-[88vh]"
      headerAction={
        <button
          onClick={() => setShowKeyConfig(!showKeyConfig)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full border transition ${
            showKeyConfig
              ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700'
              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 border-transparent hover:bg-slate-200 dark:hover:bg-gray-700'
          }`}
          title="配置高德 API Key"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Key 配置</span>
        </button>
      }
    >
      <div className="flex flex-col gap-3 pb-6">
        {/* 自定义 Key 配置抽屉折叠面板 */}
        {showKeyConfig && (
          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 animate-in fade-in slide-in-from-top-2 duration-200 text-xs">
            <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-blue-500" />
                高德开放平台 Web 服务 Key
              </span>
              <a
                href="https://console.amap.com/dev/key/app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-0.5 text-[11px] text-blue-600 dark:text-blue-400 underline hover:opacity-80"
              >
                <span>免费获取</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-slate-600 dark:text-gray-400 text-[11px] leading-relaxed mb-2.5">
              系统已内置默认通用 Key。如需更高并发或专属调用额度，可在上方高德控制台创建「Web 服务」类型的 Key 并粘贴在此处。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="在此粘贴高德 Web 服务 Key (留空恢复默认)"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveKey}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shrink-0 shadow-sm"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* 顶部搜索输入框与城市切换 */}
        <div className="relative flex items-center gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  executeSearch(keyword, cityFilter);
                }
              }}
              placeholder="搜索全国地名、道路、水库、地标、村庄..."
              className="w-full h-11 pl-10 pr-9 rounded-2xl bg-slate-100 dark:bg-gray-800/90 border border-slate-200 dark:border-gray-700/80 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-900 transition"
            />
            {keyword && (
              <button
                onClick={() => {
                  setKeyword('');
                  setPois([]);
                  setLocalMatches([]);
                  setErrorMessage(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 w-6 h-6 rounded-full grid place-items-center text-slate-400 hover:text-slate-600 dark:hover:text-white bg-slate-200/60 dark:bg-gray-700"
                aria-label="清空输入"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={() => executeSearch(keyword, cityFilter)}
            disabled={!keyword.trim() || isLoading}
            className="h-11 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white text-xs font-bold shrink-0 transition flex items-center gap-1.5 shadow-sm active:scale-95"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>搜索</span>}
          </button>
        </div>

        {/* 接口报错提示 */}
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            <span className="flex-1">接口提示: {errorMessage}（可点击右上角「Key 配置」更换可用 Key）</span>
          </div>
        )}

        {/* 搜索结果列表 */}
        {pois.length > 0 || localMatches.length > 0 ? (
          <div className="flex flex-col gap-3 mt-1">
            {/* 1. 本地图层匹配结果 */}
            {localMatches.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 px-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>本地标绘要素匹配 ({localMatches.length})</span>
                </div>
                {localMatches.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectPoi(item)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/40 hover:border-emerald-400 cursor-pointer active:scale-[0.99] transition"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0 font-medium">
                          {item.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                        {item.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => handleCopyCoord(item, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-gray-800 transition"
                        title="复制坐标"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleSelectPoi(item)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>定位</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. 高德全国 POI 结果 */}
            {pois.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-gray-400 px-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" />
                    <span>高德全国 POI 检索结果 ({pois.length})</span>
                  </span>
                  <span className="text-[10px] text-slate-400">已对齐至 WGS-84</span>
                </div>

                {pois.map((poi) => (
                  <div
                    key={poi.id}
                    onClick={() => handleSelectPoi(poi)}
                    className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-gray-800/80 border border-slate-200/90 dark:border-gray-700/70 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer shadow-sm active:scale-[0.99] transition group"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                          {poi.name}
                        </span>
                        {poi.district && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 shrink-0 font-medium">
                            {poi.district}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-gray-400 truncate mt-1">
                        {poi.address || '暂无详细街道信息'}
                      </p>

                      <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400 dark:text-gray-500 font-mono">
                        {poi.distance !== undefined && (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold font-sans">
                            距离 {formatDistance(poi.distance)}
                          </span>
                        )}
                        <span>
                          {poi.location[0].toFixed(5)}°, {poi.location[1].toFixed(5)}°
                        </span>
                      </div>
                    </div>

                    {/* 操作快捷按钮组 */}
                    <div className="flex items-center gap-1 shrink-0">
                      {onSaveAsFeature && (
                        <button
                          onClick={(e) => handleSaveAsPlotFeature(poi, e)}
                          title="将此地点存为当前图层要素"
                          className="p-2 rounded-xl text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleCopyCoord(poi, e)}
                        title="复制经纬度"
                        className="p-2 rounded-xl text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700/60 hover:text-slate-800 dark:hover:text-white transition"
                      >
                        {copiedId === poi.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => handleSelectPoi(poi)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm ml-0.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>定位</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 空状态：显示热门快捷地标、最近历史搜索 */
          <div className="flex flex-col gap-4 mt-2">
            {/* 热门地标预设 */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-gray-300">
                全国热门地标快速定位
              </span>
              <div className="flex flex-wrap gap-2">
                {POPULAR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => handlePresetClick(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-gray-800/90 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-slate-200/80 dark:border-gray-700/80 text-xs font-medium text-slate-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
                  >
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">[{p.city}]</span>
                    <span>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 历史搜索 */}
            {searchHistory.length > 0 && (
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-200/80 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-gray-300">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>最近搜索记录</span>
                  </span>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>清空</span>
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  {searchHistory.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectPoi(item)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/50 hover:bg-slate-100 dark:hover:bg-gray-800 border border-transparent hover:border-slate-200 dark:hover:border-gray-700 cursor-pointer transition text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-gray-200 truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate">
                          {item.address}
                        </span>
                      </div>
                      <Navigation className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 当前视野中心快捷提示 */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-800 text-[11px] text-slate-500 dark:text-gray-400 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-blue-500 shrink-0" />
                <span>当前视口中心:</span>
                <span className="font-mono text-slate-700 dark:text-gray-200">
                  {currentCenter[0].toFixed(5)}° E, {currentCenter[1].toFixed(5)}° N
                </span>
              </div>
              <button
                onClick={() => {
                  const text = `${currentCenter[0].toFixed(6)}, ${currentCenter[1].toFixed(6)}`;
                  copyToClipboard(text);
                  onNotify?.(`📋 已复制中心坐标: ${text}`);
                }}
                className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                复制
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};
