/**
 * 专业 GIS 标绘成果专题图生成器 (GB/T 规范制图版面)
 * 将地图画布、制图图头、双内图廓、指北针、图例面板、空间基准及标准工程图签融合成一张高精度、无压缩的专业专题图
 */

export interface MapPosterMeta {
  title?: string;
  projectName?: string;
  activeLayerName?: string;
  activeLayerColor?: string;
  featuresCount?: number;
  centerCoords?: [number, number];
  zoomLevel?: number;
  author?: string;
  layers?: { id: string; name: string; color: string; visible: boolean }[];
}

export async function generateMapPoster(
  mapDataUrl: string,
  meta: MapPosterMeta = {}
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width || 800;
        const rawH = img.naturalHeight || img.height || 600;

        // 1. 标准高精度专题图版面尺寸定义
        const POSTER_WIDTH = 1200;
        const MARGIN = 36;
        const mapW = POSTER_WIDTH - MARGIN * 2; // 1128px
        const mapRatio = rawH / rawW;
        // 地图视窗高度：自适应原始比例，并确保比例舒展大气
        const mapH = Math.max(650, Math.min(1450, Math.round(mapW * mapRatio)));

        const HEADER_HEIGHT = 136;
        const TITLE_BLOCK_HEIGHT = 92;
        const GAP = 18;

        const mapX = MARGIN;
        const mapY = HEADER_HEIGHT;
        const titleBlockY = mapY + mapH + GAP;
        const POSTER_HEIGHT = titleBlockY + TITLE_BLOCK_HEIGHT + MARGIN;

        // 创建高精度输出画布
        const canvas = document.createElement('canvas');
        canvas.width = POSTER_WIDTH;
        canvas.height = POSTER_HEIGHT;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(mapDataUrl);
        }

        // 2. 绘制纯白高清绘图纸张背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

        // 绘制专业图纸外图廓线 (Double Neatline)
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(12, 12, POSTER_WIDTH - 24, POSTER_HEIGHT - 24);

        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.strokeRect(17, 17, POSTER_WIDTH - 34, POSTER_HEIGHT - 34);

        // 3. 绘制顶部独立图名区 (Header Title Section)
        const centerX = POSTER_WIDTH / 2;

        // 主标题
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 30px "PingFang SC", "Microsoft YaHei", "SimHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(meta.title || '现场空间地理协同标绘成果专题图', centerX, 44);

        // 英文副标题
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px monospace, sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText('SPATIAL GEOGRAPHICAL COLLABORATIVE PLOTTING THEMATIC MAP', centerX, 74);
        ctx.letterSpacing = '0px';

        // 工程与成果元数据注记行
        ctx.fillStyle = '#475569';
        ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif';
        const projectDesc = `工程项目: ${meta.projectName || '城市空间地理协同规划平台'}   |   成果等级: 现场作业成果图   |   空间基准: CGCS2000 / WGS-84`;
        ctx.fillText(projectDesc, centerX, 98);

        // 装饰分割双线
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(MARGIN, 118);
        ctx.lineTo(POSTER_WIDTH - MARGIN, 118);
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(MARGIN, 122);
        ctx.lineTo(POSTER_WIDTH - MARGIN, 122);
        ctx.stroke();

        // 4. 绘制地图核心视窗 (Map Window)
        // 底层淡雅基底，防透明破缺
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(mapX, mapY, mapW, mapH);

        // 绘制实际高精度地图画面
        ctx.drawImage(img, 0, 0, rawW, rawH, mapX, mapY, mapW, mapH);

        // 地图内图廓边框 (Crisp Map Frame)
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(mapX, mapY, mapW, mapH);

        // 5. 绘制右上角专业制图指北针 (Cartographic Compass)
        const compassX = mapX + mapW - 58;
        const compassY = mapY + 58;
        const compassR = 26;

        // 指北针底盘 (半透明白玉底座 + 阴影)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(compassX, compassY, compassR + 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();

        // 刻度环
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(compassX, compassY, compassR - 2, 0, Math.PI * 2);
        ctx.stroke();

        // 红色指北主针
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(compassX, compassY - compassR);
        ctx.lineTo(compassX - 6, compassY);
        ctx.lineTo(compassX, compassY - 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.moveTo(compassX, compassY - compassR);
        ctx.lineTo(compassX + 6, compassY);
        ctx.lineTo(compassX, compassY - 3);
        ctx.closePath();
        ctx.fill();

        // 钢灰指南主针
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(compassX, compassY + compassR);
        ctx.lineTo(compassX - 6, compassY);
        ctx.lineTo(compassX, compassY + 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(compassX, compassY + compassR);
        ctx.lineTo(compassX + 6, compassY);
        ctx.lineTo(compassX, compassY + 3);
        ctx.closePath();
        ctx.fill();

        // 北标字符 "N"
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('N', compassX, compassY - compassR - 3);

        // 6. 绘制左下角专题图例面板 (Thematic Legend Card)
        const legendW = 280;
        const legendH = 92;
        const legendX = mapX + 16;
        const legendY = mapY + mapH - legendH - 16;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, legendW, legendH, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 图例标题
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText('【 图例 LEGEND 】', legendX + 14, legendY + 18);

        // 图例项 1: 工作图层
        const layerColor = meta.activeLayerColor || '#3b82f6';
        ctx.fillStyle = layerColor;
        ctx.beginPath();
        ctx.roundRect(legendX + 16, legendY + 38, 16, 16, 4);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px "PingFang SC", sans-serif';
        const layerNameDisplay = (meta.activeLayerName || '默认工作图层').length > 15
          ? (meta.activeLayerName || '默认工作图层').slice(0, 14) + '...'
          : meta.activeLayerName || '默认工作图层';
        ctx.fillText(`${layerNameDisplay} (当前图层)`, legendX + 40, legendY + 46);

        // 图例项 2: 要素统计标示
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(legendX + 24, legendY + 72, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#475569';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText(`标绘实体: 共计 ${meta.featuresCount ?? 0} 个空间几何要素`, legendX + 40, legendY + 72);

        // 7. 绘制右下角空间基准与比例说明卡片 (Spatial Reference Card)
        const refW = 270;
        const refH = 68;
        const refX = mapX + mapW - refW - 16;
        const refY = mapY + mapH - refH - 16;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
        ctx.beginPath();
        ctx.roundRect(refX, refY, refW, refH, 12);
        ctx.fill();

        ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 11px "PingFang SC", sans-serif';
        ctx.fillText('空间基准: CGCS2000 / WGS-84 (EPSG:3857)', refX + 14, refY + 20);

        ctx.fillStyle = '#475569';
        ctx.font = '10px monospace';
        const centerStr = meta.centerCoords
          ? `视口中心: ${meta.centerCoords[0].toFixed(4)}°E, ${meta.centerCoords[1].toFixed(4)}°N`
          : '中心坐标: 自动校准';
        ctx.fillText(centerStr, refX + 14, refY + 38);

        const zoomStr = meta.zoomLevel ? `地图缩放: Level ${meta.zoomLevel}` : '缩放比例: 现场自适应';
        ctx.fillText(zoomStr, refX + 14, refY + 53);

        // 8. 绘制底部标准工程图签表格 (Engineering Title Block)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(mapX, titleBlockY, mapW, TITLE_BLOCK_HEIGHT);

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(mapX, titleBlockY, mapW, TITLE_BLOCK_HEIGHT);

        // 表格内部网格线 (2行 3列)
        const midRowY = titleBlockY + TITLE_BLOCK_HEIGHT / 2;
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;

        // 水平分界线
        ctx.beginPath();
        ctx.moveTo(mapX, midRowY);
        ctx.lineTo(mapX + mapW, midRowY);
        ctx.stroke();

        // 垂直分界线
        const col1W = Math.round(mapW * 0.40);
        const col2W = Math.round(mapW * 0.35);

        ctx.beginPath();
        ctx.moveTo(mapX + col1W, titleBlockY);
        ctx.lineTo(mapX + col1W, titleBlockY + TITLE_BLOCK_HEIGHT);
        ctx.moveTo(mapX + col1W + col2W, titleBlockY);
        ctx.lineTo(mapX + col1W + col2W, titleBlockY + TITLE_BLOCK_HEIGHT);
        ctx.stroke();

        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;

        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        // 单元格 1-1: 制图单位
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('制图单位:', mapX + 16, titleBlockY + 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText('外业空间地理协同标绘作业组', mapX + 76, titleBlockY + 16);

        // 单元格 2-1: 依托平台
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('系统平台:', mapX + 16, midRowY + 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText('空间地理协同采集与态势推演平台 (MapTalks GL)', mapX + 76, midRowY + 16);

        // 单元格 1-2: 标绘图层
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('工作图层:', mapX + col1W + 16, titleBlockY + 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        const layerText = (meta.activeLayerName || '默认工作图层').length > 18
          ? (meta.activeLayerName || '默认工作图层').slice(0, 17) + '...'
          : meta.activeLayerName || '默认工作图层';
        ctx.fillText(layerText, mapX + col1W + 76, titleBlockY + 16);

        // 单元格 2-2: 要素统计
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('要素规模:', mapX + col1W + 16, midRowY + 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText(`已标绘 ${meta.featuresCount ?? 0} 个有效空间地物要素`, mapX + col1W + 76, midRowY + 16);

        // 单元格 1-3: 作业人员
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('作业人员:', mapX + col1W + col2W + 16, titleBlockY + 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px "PingFang SC", sans-serif';
        ctx.fillText(meta.author || '系统主管', mapX + col1W + col2W + 76, titleBlockY + 16);

        // 单元格 2-3: 出图日期
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "PingFang SC", sans-serif';
        ctx.fillText('出图时间:', mapX + col1W + col2W + 16, midRowY + 16);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(timeStr, mapX + col1W + col2W + 76, midRowY + 16);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        console.warn('Canvas poster composition error:', err);
        resolve(mapDataUrl);
      }
    };

    img.onerror = (e) => {
      console.warn('Failed to load map data URL into image:', e);
      resolve(mapDataUrl);
    };

    img.src = mapDataUrl;
  });
}
