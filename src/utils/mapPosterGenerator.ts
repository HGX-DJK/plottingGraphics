/**
 * 高清专业标绘成果图生成器
 * 将 MapTalks Canvas 底图与工程图例、标题、图层信息、北向指示器、时间水印等融合成一张专业外业成果图片
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
}

export async function generateMapPoster(
  mapDataUrl: string,
  meta: MapPosterMeta = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(mapDataUrl);
        }

        // 1. 绘制底层地图完整画面
        ctx.drawImage(img, 0, 0, w, h);

        const now = new Date();
        const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          '0'
        )}-${String(now.getDate()).padStart(2, '0')} ${String(
          now.getHours()
        ).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        // 2. 绘制顶部信息条 (柔和深灰半透明遮罩)
        const topBarHeight = Math.max(72, Math.round(h * 0.09));
        const gradTop = ctx.createLinearGradient(0, 0, 0, topBarHeight * 1.4);
        gradTop.addColorStop(0, 'rgba(15, 23, 42, 0.88)');
        gradTop.addColorStop(0.7, 'rgba(15, 23, 42, 0.65)');
        gradTop.addColorStop(1, 'rgba(15, 23, 42, 0)');
        ctx.fillStyle = gradTop;
        ctx.fillRect(0, 0, w, topBarHeight * 1.4);

        // 主标题
        ctx.fillStyle = '#ffffff';
        const titleFontSize = Math.max(16, Math.round(topBarHeight * 0.32));
        ctx.font = `bold ${titleFontSize}px sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 6;
        ctx.fillText(meta.title || '标绘系统 • 现场态势标绘成果简报', 24, topBarHeight * 0.44);

        // 副标题 / 图层信息
        ctx.shadowBlur = 0;
        const subFontSize = Math.max(11, Math.round(topBarHeight * 0.2));
        ctx.font = `500 ${subFontSize}px sans-serif`;

        // 绘制图层色块指示点
        const layerColor = meta.activeLayerColor || '#3b82f6';
        ctx.fillStyle = layerColor;
        ctx.beginPath();
        ctx.arc(28, topBarHeight * 0.78, Math.round(subFontSize * 0.4), 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        const layerText = `当前工作图层: ${meta.activeLayerName || '默认工作图层'}  |  要素总数: ${
          meta.featuresCount ?? 0
        } 个`;
        ctx.fillText(layerText, 38, topBarHeight * 0.84);

        // 3. 绘制指北针徽标 (右上角)
        const compassX = w - 44;
        const compassY = Math.round(topBarHeight * 0.48);
        const compassR = Math.max(14, Math.round(topBarHeight * 0.22));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.arc(compassX, compassY, compassR + 4, 0, Math.PI * 2);
        ctx.fill();

        // 红色北针
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(compassX, compassY - compassR);
        ctx.lineTo(compassX - compassR * 0.4, compassY);
        ctx.lineTo(compassX + compassR * 0.4, compassY);
        ctx.closePath();
        ctx.fill();

        // 白色南针
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(compassX, compassY + compassR);
        ctx.lineTo(compassX - compassR * 0.4, compassY);
        ctx.lineTo(compassX + compassR * 0.4, compassY);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 8px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText('N', compassX, compassY - compassR - 2);
        ctx.textAlign = 'start';

        // 4. 绘制底部水印防伪与版权条
        const bottomBarHeight = Math.max(34, Math.round(h * 0.045));
        const gradBottom = ctx.createLinearGradient(0, h - bottomBarHeight * 1.5, 0, h);
        gradBottom.addColorStop(0, 'rgba(15, 23, 42, 0)');
        gradBottom.addColorStop(0.5, 'rgba(15, 23, 42, 0.7)');
        gradBottom.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
        ctx.fillStyle = gradBottom;
        ctx.fillRect(0, h - bottomBarHeight * 1.5, w, bottomBarHeight * 1.5);

        // 底部文本
        ctx.fillStyle = '#94a3b8';
        const footFontSize = Math.max(10, Math.round(bottomBarHeight * 0.35));
        ctx.font = `${footFontSize}px monospace`;
        const coordInfo = meta.centerCoords
          ? `中心: ${meta.centerCoords[0].toFixed(4)}°E, ${meta.centerCoords[1].toFixed(4)}°N  |  `
          : '';
        ctx.fillText(
          `${coordInfo}采集时间: ${timeStr}  |  坐标基准: WGS-84  |  标绘系统 MapTalks GL`,
          24,
          h - Math.round(bottomBarHeight * 0.35)
        );

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
