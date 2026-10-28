const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG chunk maker
function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body) >>> 0, 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rowSize = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowSize));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowSize);
    rawData[rawOffset] = 0; // Filter 0
    rgbaBuffer.copy(rawData, rawOffset + 1, y * rowSize, (y + 1) * rowSize);
  }
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Distance to segment
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Point in polygon
function pointInPoly(px, py, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i][0], yi = vertices[i][1];
    const xj = vertices[j][0], yj = vertices[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Renderer for Plotting System Launcher Icons
// kind: 'full_square' | 'full_round' | 'foreground'
function renderIcon(size, kind) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 108;

  // Vertices in 108x108 space
  const poly = [
    [54, 28],
    [74, 46],
    [64, 76],
    [36, 70],
    [28, 48]
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / scale; // 0..108
      const ny = y / scale;

      let r = 0, g = 0, b = 0, a = 0;

      // Helper to blend color
      function blend(br, bg, bb, ba) {
        if (ba <= 0) return;
        const outA = ba + a * (1 - ba);
        if (outA > 0) {
          r = Math.round((br * ba + r * a * (1 - ba)) / outA);
          g = Math.round((bg * ba + g * a * (1 - ba)) / outA);
          b = Math.round((bb * ba + b * a * (1 - ba)) / outA);
          a = outA;
        }
      }

      // 1. If not foreground only, draw background
      if (kind !== 'foreground') {
        let mask = 1.0;
        if (kind === 'full_round') {
          // Circular mask
          const distToCenter = Math.hypot(nx - 54, ny - 54);
          mask = Math.max(0, Math.min(1, (52.5 - distToCenter) * scale));
        } else {
          // Squircle / rounded rect mask (radius 22 in 108 coordinate space)
          const rx = Math.max(0, Math.abs(nx - 54) - (52 - 20));
          const ry = Math.max(0, Math.abs(ny - 54) - (52 - 20));
          const d = Math.hypot(rx, ry);
          mask = Math.max(0, Math.min(1, (20 - d) * scale));
        }

        if (mask > 0) {
          // Deep Navy Gradient Background
          const t = ny / 108;
          const bgR = Math.round(11 * (1 - t) + 16 * t);
          const bgG = Math.round(19 * (1 - t) + 28 * t);
          const bgB = Math.round(41 * (1 - t) + 58 * t);
          blend(bgR, bgG, bgB, mask);

          // Grid lines (every 18 units)
          const gridDistX = Math.abs((nx % 18) - 9);
          const gridDistY = Math.abs((ny % 18) - 9);
          if (nx % 18 < 1 || ny % 18 < 1) {
            blend(30, 58, 95, 0.4 * mask);
          }

          // Radar circle
          const distC = Math.hypot(nx - 54, ny - 54);
          const ringDist = Math.abs(distC - 36);
          if (ringDist < 1.2) {
            const ringA = Math.max(0, 1 - ringDist / 1.2) * 0.5 * mask;
            blend(30, 64, 110, ringA);
          }
          const ringDist2 = Math.abs(distC - 20);
          if (ringDist2 < 1.0) {
            const ringA = Math.max(0, 1 - ringDist2 / 1.0) * 0.35 * mask;
            blend(25, 55, 95, ringA);
          }
        }
      }

      // 2. Polygon fill
      if (pointInPoly(nx, ny, poly)) {
        blend(2, 132, 199, 0.45); // vibrant cyan-blue translucency
      }

      // 3. Diagonal chord lines
      const chord1 = distToSegment(nx, ny, 54, 28, 64, 76);
      if (chord1 < 1.2) {
        const ca = Math.max(0, 1 - chord1 / 1.2) * 0.5;
        blend(30, 64, 175, ca);
      }
      const chord2 = distToSegment(nx, ny, 28, 48, 74, 46);
      if (chord2 < 1.2) {
        const ca = Math.max(0, 1 - chord2 / 1.2) * 0.5;
        blend(30, 64, 175, ca);
      }

      // 4. Polygon outline (Electric Cyan #38BDF8)
      let minEdgeDist = 999;
      for (let i = 0; i < poly.length; i++) {
        const next = poly[(i + 1) % poly.length];
        const d = distToSegment(nx, ny, poly[i][0], poly[i][1], next[0], next[1]);
        if (d < minEdgeDist) minEdgeDist = d;
      }
      if (minEdgeDist < 2.0) {
        const edgeA = Math.max(0, Math.min(1, (2.0 - minEdgeDist) * scale));
        blend(56, 189, 248, edgeA);
      }

      // 5. Polygon vertices nodes
      for (let i = 0; i < poly.length; i++) {
        const vx = poly[i][0], vy = poly[i][1];
        const distV = Math.hypot(nx - vx, ny - vy);
        // Outer glow/ring
        if (distV < 4.2) {
          const vA = Math.max(0, Math.min(1, (4.2 - distV) * scale));
          blend(56, 189, 248, vA);
        }
        // Inner white dot
        if (distV < 2.0) {
          const vA = Math.max(0, Math.min(1, (2.0 - distV) * scale));
          blend(255, 255, 255, vA);
        }
      }

      // 6. Central Reticle & Crosshair (center: 54, 52)
      const rcx = 54, rcy = 52;
      const distRet = Math.hypot(nx - rcx, ny - rcy);
      
      // Reticle Ring
      const ringDelta = Math.abs(distRet - 7.5);
      if (ringDelta < 1.4) {
        const rA = Math.max(0, 1 - ringDelta / 1.4);
        blend(245, 158, 11, rA); // Amber #F59E0B
      }
      // Reticle ticks
      const tick1 = distToSegment(nx, ny, 54, 40, 54, 44);
      const tick2 = distToSegment(nx, ny, 54, 60, 54, 64);
      const tick3 = distToSegment(nx, ny, 42, 52, 46, 52);
      const tick4 = distToSegment(nx, ny, 62, 52, 66, 52);
      const minTick = Math.min(tick1, tick2, tick3, tick4);
      if (minTick < 1.2) {
        const tA = Math.max(0, Math.min(1, (1.2 - minTick) * scale));
        blend(245, 158, 11, tA);
      }
      // Reticle center pinpoint
      if (distRet < 2.4) {
        const pA = Math.max(0, Math.min(1, (2.4 - distRet) * scale));
        blend(245, 158, 11, pA);
      }
      if (distRet < 1.2) {
        const pA = Math.max(0, Math.min(1, (1.2 - distRet) * scale));
        blend(255, 255, 255, pA);
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = Math.round(a * 255);
    }
  }

  return encodePng(size, size, buf);
}

// Generate for all density targets
const targets = [
  { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 }
];

const baseResDir = path.resolve(__dirname, '../android/app/src/main/res');

for (const t of targets) {
  const dirPath = path.join(baseResDir, t.dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  // 1. ic_launcher.png
  const launcherPng = renderIcon(t.iconSize, 'full_square');
  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), launcherPng);

  // 2. ic_launcher_round.png
  const roundPng = renderIcon(t.iconSize, 'full_round');
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), roundPng);

  // 3. ic_launcher_foreground.png
  const fgPng = renderIcon(t.fgSize, 'foreground');
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), fgPng);

  console.log(`Generated icons for ${t.dir}: ic_launcher (${t.iconSize}x${t.iconSize}), foreground (${t.fgSize}x${t.fgSize})`);
}

console.log('All Android icons generated successfully!');
