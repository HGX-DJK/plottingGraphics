# GeoPlot Studio — 城市空间规划与外业调查移动标绘系统

基于 **MapTalks GL** 引擎的移动端优先 GIS 标绘应用。面向城市规划编制、外业调查与应急保障场景，
提供图层协同管理、多类型空间要素标绘、属性实时编辑、空间量算与工程数据互通能力。

纯前端实现，**无后端依赖**，工程数据保存在设备本地 LocalStorage；通过 Capacitor 打包为 Android 应用，
可在手机、平板上直接外业使用。

---

## 一、技术栈与运行环境

| 项目 | 选型 | 说明 |
| --- | --- | --- |
| 构建 | Vite 5 + TypeScript 5.6 | 严格模式类型检查 |
| 框架 | React 18 | 函数组件 + Hooks，全量 `React.memo` 优化 |
| 样式 | Tailwind CSS 3 + PostCSS | 明暗双主题，遵循 `html.dark` / `html.light` 类名切换 |
| 地图引擎 | MapTalks GL | **官方 CDN 异步引入**，不参与 npm 打包 |
| 底图 | Esri / ArcGIS 服务 | 免 API Key、零水印 |
| 容器 | Capacitor 8（Android） | 打包为 APK 分发 |
| 包管理 | pnpm 9 | CI 使用 `pnpm/action-setup` |

### 地图引擎引入方式

MapTalks GL 按官方规范以 `link` + `script` 方式在 `index.html` 中异步引入：

```html
<link rel="stylesheet" href="https://maptalks.com/api/maptalks-gl.css" media="print" onload="this.media='all'" />
<script type="text/javascript" src="https://maptalks.com/api/maptalks-gl.js" async></script>
```

样式表与脚本均采用非阻塞加载：CDN 抖动或不可达时，页面仍能立即渲染登录页与「引擎加载中」遮罩，
不会整页白屏。

### 坐标基准

- **数据坐标**：WGS-84 / CGCS2000（EPSG:4326），统一以 `[经度, 纬度]` 存储。
- **渲染投影**：EPSG:3857（Web 墨卡托），由 MapTalks GL 内部处理。
- **POI 对齐**：高德返回的是 GCJ-02 火星坐标，检索结果经迭代反算转换回 WGS-84 后才落到图面，
  转换实现与 AutoNavi 官方算法逐位对齐（详见 `src/utils/geoUtils.ts` 注释）。

---

## 二、功能总览

### 1. 身份与权限（本地 Mock Auth）

- 三个预置工号一键登录：`admin`（GIS 系统主管）、`surveyor`（外业调查员）、`analyst`（数据分析师）。
- 也支持任意用户名自定义登录，自动分配为外业工程师角色。
- 「记住我」开启时凭证写入 LocalStorage（关闭浏览器仍保持登录并记住工号），
  关闭时仅写入 SessionStorage（关闭标签页即失效）。
- 退出登录只清除登录态，保留已记住的工号便于下次快速登录。

### 2. 图层协同管理

- 新建图层：自定义名称、配色与业务描述。
- 工作图层切换：新建要素自动归属当前选中图层。
- 独立显隐、锁定保护、0%~100% 透明度实时调节。
- 实时统计各图层要素数量；删除图层时级联清理其下要素与选中态。

### 3. 空间要素标绘（18 种类型）

**基础空间几何**
多边形（地块/范围面）、折线（路线/走向）、空间位置点（图钉）、矩形框（BBox 搜索网格）、
圆形缓冲区（米级半径）、空间地物注记（文本）、自由手绘轨迹线。

**外业调查专题图元**
控制测量与核查点、生态环境监测站、市政基础设施点、地灾与风险隐患点、应急医疗与避难所。

**方向与范围标绘**
空间发展推进轴（宽体推进箭头）、规划导向直箭头、重点管控集结地域、监测覆盖扇形区、
双向分流与汇聚标绘。

绘制交互：连续打点，鼠标移动时半透明虚线实时预览，双击结束绘制，`Esc` 撤回取消；
顶栏显示实时打点数与撤回按钮。

### 4. 属性配置与联动

- **要素清单**：关键字模糊搜索、按图层筛选、点击条目地图镜头平滑定位。
- **属性面板**：名称、备注、归属图层、线色/线宽（1~10px）/线型、填充色与不透明度、
  注记文本与字号、圆形半径。
- **空间指标自动测算**：面积（m²）、长度/周长（m）随坐标实时计算。
- **业务扩展字段**：`customAttributes` 键值对，保留权属单位、批复号、巡检周期等业务信息。
- **跨抽屉持久化**：抽屉关闭再打开，属性编辑结果仍然生效。

### 5. 空间量算

- 测距：大圆球面距离，多段折线累计测距，实时显示总长。
- 测面：球面多边形面积，自动换算 ha / km²。
- 支持逐点撤回与一键清空；量算图层独立，不污染工程数据。

### 6. 底图与主题

- 三种底图切换：**暗夜科技**（Esri 极夜深灰）、**卫星遥感**（ArcGIS 全球正射影像）、
  **现代街道**（Esri World Street Map）。
- 明暗双主题，手动切换并持久化；首次访问跟随系统 `prefers-color-scheme`。

### 7. 工程数据互通

- **成果图导出**：合成带工程标题、指北针、图层色标、空间基准与时间戳的高清水印专题图。
- **工程备份（JSON）**：导出图层与要素，含 `spatialReference: EPSG:4326` 元信息，可原样导回。
- **地理矢量（GeoJSON）**：导出标准 RFC 7946 GeoJSON，可直接接入第三方 GIS 平台；
  要素的 `properties` 中保留 `layerId` 与 `layerName`，导回本应用时能还原图层分组与名称。
- **导出范围可选**：导出弹窗提供「当前图层 / 全部图层」切换，并实时显示将要导出的图层数与要素数。
- **真机下载落盘**：Android 端经原生桥 `AndroidNative.saveTextToDownloads` 写入系统「下载」目录，
  桌面端依次降级为系统分享面板与 Blob 下载。
- **数据导入**：支持备份文件与 GeoJSON 导入；带 `layerId` 的 GeoJSON 自动按原图层还原分组。
- **面类要素往返保真**：圆、扇面、箭头、集结地域的 `geometry` 按 RFC 7946 存的是渲染后的真实图形，
  同时在 `properties.sourceCoords` 额外保留绘制控制点。导入时优先用控制点还原，
  避免往返一次后圆心偏移、半径回落默认值。该字段对第三方 GIS 软件无害（标准解析器会忽略）。
- **一键恢复示例工程**：内置规划红线、交通廊道、外业调查、应急防护四组示例图层与要素。

### 8. 在线 POI 检索

通过高德开放平台检索全国 POI。**系统不内置任何共享 Key**，需在「我的 → POI 检索」中自行配置
高德 Web 服务 Key；未配置时该功能降级为「仅本地要素匹配」并给出明确提示，不会静默失败。

---

## 三、界面结构

移动端单屏布局，底部五个页签（`MobileTabBar`），抽屉组件按需挂载：

| 页签 | 内容 |
| --- | --- |
| 图层 | 图层列表、显隐/锁定/透明度、要素计数 |
| 标绘 | 标绘工具箱（核心大按钮），绘制中态变为琥珀色 |
| 要素 | 要素清单、搜索筛选、点击定位 |
| 属性 | 选中要素的属性编辑面板（未选中时禁用） |
| 我的 | 账号信息、主题、底图、POI 检索、成果图导出、导入导出 |

顶栏提供视口中心经纬度读数（`map.getCenter()`，5 位小数）与缩放级别。
底栏抽屉支持手势下拉关闭、滚动锁、焦点陷阱与 `Esc` 关闭。

---

## 四、常用命令

```bash
pnpm install          # 安装依赖
pnpm run dev          # 启动开发服务器 (http://localhost:5173)
pnpm run typecheck    # 仅做类型检查 (tsc --noEmit)
pnpm run build        # 类型检查 + 生产构建，产物在 dist/
pnpm run preview      # 本地预览构建产物

pnpm run cap:sync     # 同步 Web 产物到 Capacitor Android 工程
pnpm run cap:open     # 用 Android Studio 打开原生工程
pnpm run cap:build    # 构建 + 同步，一步到位
```

### 构建体积

主包经代码分割后约 **356 kB**（gzip **103 kB**），CSS 约 **79 kB**（gzip **12 kB**），
另有 6 个按需加载的懒加载 chunk（导入导出 / POI 检索 / 新建图层 / 成果图预览等低频功能，
合计约 20 kB gzip）与 1 个共享图标 chunk。

---

## 五、工程结构

```
src/
├── App.tsx                    # 应用主容器：状态编排、抽屉按需挂载、懒加载边界
├── main.tsx                   # 入口，挂载全局 ErrorBoundary
├── components/
│   ├── ErrorBoundary.tsx      # 渲染异常兜底，提供重试 / 重载 / 清数据重载
│   ├── Map/
│   │   ├── MaptalksContainer.tsx      # 地图容器、增量几何重建、viewchange 节流
│   │   ├── hooks/useMapMeasurement.ts # 测距/测面量算
│   │   ├── hooks/usePlotDrawing.ts    # 标绘交互与打点状态
│   │   └── utils/                      # featureGeometry / mapBasemap
│   ├── Mobile/                # 移动端底部抽屉与页签组件
│   └── Modals/                # 导入导出 / 新建图层 / 成果图 / 确认弹窗
├── hooks/                     # useLayers / useFeatures / useToast
├── services/                  # storageService / authService / themeService / amapSearchService
├── utils/                     # geoUtils / plotAlgorithms / markerIcons / mapPosterGenerator
└── types/                     # 全局类型定义
```

### 性能设计要点

- **增量几何重建**：以要素对象引用变化 + 选中态变化作为重建判据，绘制工具与图层锁定态改由 ref 读取，
  切换工具零重建；全部抽屉 / 弹窗 / 地图容器统一 `React.memo` 包装。
- **节流**：视口中心读数改用 `viewchange` 事件 + 120ms 节流；标绘预览的 `mousemove` 走 60ms 节流，
  替代原先每帧重建预览几何体 + 触发全树重渲染的做法。
- **稳定引用**：图层 / 要素回调改用 ref 持有最新值，`handleDeleteLayer` / `handleDeleteFeature` /
  成果图导出回调不再随无关状态变化换引用，保证 `React.memo` 真正生效。
- **按需挂载**：抽屉与弹窗关闭即卸载，低频模块 `React.lazy` 拆分。
- **写入防抖**：LocalStorage 写入合并为 300ms 一次，且 `JSON.stringify` 推迟到真正落盘时才执行；
  页面隐藏 / 卸载时立即冲刷，避免掉帧与数据丢失。
- **索引缓存**：要素按图层分组、图层要素计数、图层索引表统一 `useMemo` 预计算；
  吸附候选顶点按要素 / 图层 / 打点引用缓存，避免每次指针移动全量重算。
- **图标缓存**：SVG 图标 Data URI 按（类型, 颜色）缓存并采用 LRU 淘汰，避免重复 base64 编码。

---

## 六、持续集成

`.github/workflows/ci.yml` 在 push / PR / 手动触发时执行：

1. **Type check**（`pnpm run typecheck`）——独立步骤，类型错误单独报错。
2. **Build** —— 生产构建并上传 `dist/` 产物。
3. **Package APK** —— 同步 Capacitor Android 工程并用 Gradle 构建 Debug APK，上传为构建产物。

> 当前尚未接入 ESLint。如需启用，需新增开发依赖与配置文件，属于依赖变更，需团队确认后进行。

---

## 七、已知限制

- **地图引擎与底图依赖公网 CDN**：MapTalks GL 与 Esri/ArcGIS 瓦片均在运行时联网获取，
  弱网或离线环境下地图不可用（登录页与应用外壳仍可正常渲染）。
- **本地存储容量**：工程数据存于 LocalStorage（约 5 MB 上限），要素数量极大时需导出备份后清理。
  写入配额耗尽时会保留待写数据并在界面弹出提示，不会静默丢弃。
- **高德 POI 检索需自备 Key**：未配置时该功能不可用，其余标绘功能不受影响。
- **`legacy/` 与 `.archive/` 为存档区**：分别为已废弃的桌面端 UI 与开发期截图，
  均已被 `.gitignore` 排除，不参与构建与类型检查，可直接删除。
- **正式 APK 已关闭 WebView 调试**：调试请在 `capacitor.config.json` 中临时开启
  `webContentsDebuggingEnabled`，发布前务必改回 `false`。
- **原生桥改动需重编 APK 生效**：`AndroidNative` 桥（如 `saveTextToDownloads`）属原生代码，
  修改后必须重新执行 `pnpm run cap:build` 并重新安装 APK，仅刷新前端页面不会生效。
  未重编时前端会自动降级到系统分享面板 / 桌面 Blob 下载，不会静默失败。

---

## 八、许可与致谢

- 地图引擎：[MapTalks GL](https://maptalks.com/)
- 底图数据：Esri World Imagery / World Street Map / Dark Gray Canvas（ArcGIS Online 公开服务）
- 坐标转换算法参考：[eviltransform](https://github.com/googollee/eviltransform)、
  [coordtransform](https://github.com/wandergis/coordtransform)（GCJ-02 ⇄ WGS-84）
