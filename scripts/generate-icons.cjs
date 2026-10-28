const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

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
  ihdrData.writeUInt8(8, 8); // 8-bit
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const rowSize = width * 4;
  const rawData = Buffer.alloc(height * (1 + rowSize));
  for (let y = 0; y < height; y++) {
    const rawOffset = y * (1 + rowSize);
    rawData[rawOffset] = 0;
    rgbaBuffer.copy(rawData, rawOffset + 1, y * rowSize, (y + 1) * rowSize);
  }
  const idatChunk = makeChunk('IDAT', zlib.deflateSync(rawData, { level: 9 }));
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

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

// Distance to pin teardrop
function distToPin(px, py) {
  const cx = 47, cy = 37, r = 8;
  const distCircle = Math.hypot(px - cx, py - cy);
  if (py <= cy) return distCircle - r;
  // bottom cone to (47, 53)
  const dLeft = distToSegment(px, py, 47 - 7.5, 39, 47, 53);
  const dRight = distToSegment(px, py, 47 + 7.5, 39, 47, 53);
  if (px >= 47 - 7.5 && px <= 47 + 7.5 && py <= 53) {
    if (distCircle < r) return -1;
    return Math.min(dLeft, dRight) * (pointInPoly(px, py, [[47-7.5, 39], [47+7.5, 39], [47, 53]]) ? -1 : 1);
  }
  return Math.min(distCircle - r, dLeft, dRight);
}

// Map leaves
const leafLeft = [[24, 37], [40, 33], [40, 73], [24, 77]];
const leafMid = [[40, 33], [56, 37], [56, 77], [40, 73]];
const leafRight = [[56, 37], [72, 33], [72, 73], [56, 77]];
const mapShadow = [[25, 79], [41, 75], [57, 79], [73, 75], [76, 77], [57, 81], [41, 77], [23, 81]];

// Stylus barrel polygon
const penBarrel = [[67, 45], [77, 35], [81, 39], [71, 49]];
const penTip = [[64, 48], [67, 45], [71, 49]];

function renderIcon(size, kind) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 108;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const nx = x / scale;
      const ny = y / scale;

      let r = 0, g = 0, b = 0, a = 0;

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

      // 1. Background (Vibrant Royal Blue Gradient)
      if (kind !== 'foreground') {
        let mask = 1.0;
        if (kind === 'full_round') {
          const distToCenter = Math.hypot(nx - 54, ny - 54);
          mask = Math.max(0, Math.min(1, (52.5 - distToCenter) * scale));
        } else {
          const rx = Math.max(0, Math.abs(nx - 54) - (52 - 20));
          const ry = Math.max(0, Math.abs(ny - 54) - (52 - 20));
          const d = Math.hypot(rx, ry);
          mask = Math.max(0, Math.min(1, (20 - d) * scale));
        }

        if (mask > 0) {
          // Top #2563EB to Bottom #1D4ED8
          const t = ny / 108;
          const bgR = Math.round(37 * (1 - t) + 29 * t);
          const bgG = Math.round(99 * (1 - t) + 78 * t);
          const bgB = Math.round(235 * (1 - t) + 216 * t);
          blend(bgR, bgG, bgB, mask);

          // Grid lines
          if (nx % 18 < 1.2 || ny % 18 < 1.2) {
            blend(59, 130, 246, 0.45 * mask);
          }

          // Radar rings
          const distC = Math.hypot(nx - 54, ny - 54);
          if (Math.abs(distC - 38) < 1.4) {
            blend(96, 165, 250, 0.4 * mask);
          }
          if (Math.abs(distC - 22) < 1.2) {
            blend(147, 197, 253, 0.3 * mask);
          }
        }
      }

      // 2. Map shadow
      if (pointInPoly(nx, ny, mapShadow)) {
        blend(11, 28, 77, 0.4);
      }

      // 3. Folded map leaves
      if (pointInPoly(nx, ny, leafLeft)) {
        blend(226, 232, 240, 1.0); // slate-200
      } else if (pointInPoly(nx, ny, leafMid)) {
        blend(203, 213, 225, 1.0); // slate-300
      } else if (pointInPoly(nx, ny, leafRight)) {
        blend(255, 255, 255, 1.0); // pure white
      }

      // Leaf folds / borders
      const border1 = distToSegment(nx, ny, 40, 33, 40, 73);
      if (border1 < 1.0 && (pointInPoly(nx, ny, leafLeft) || pointInPoly(nx, ny, leafMid))) {
        blend(148, 163, 184, 0.8);
      }
      const border2 = distToSegment(nx, ny, 56, 37, 56, 77);
      if (border2 < 1.0 && (pointInPoly(nx, ny, leafMid) || pointInPoly(nx, ny, leafRight))) {
        blend(148, 163, 184, 0.8);
      }

      // Contour lines on map
      const cLine1 = distToSegment(nx, ny, 26, 56, 40, 53);
      const cLine2 = distToSegment(nx, ny, 40, 53, 56, 47);
      const cLine3 = distToSegment(nx, ny, 56, 47, 70, 45);
      const minCLine = Math.min(cLine1, cLine2, cLine3);
      if (minCLine < 1.2 && (pointInPoly(nx, ny, leafLeft) || pointInPoly(nx, ny, leafMid) || pointInPoly(nx, ny, leafRight))) {
        blend(147, 197, 253, 0.8);
      }

      // 4. Plotting vector trajectory line (Blue/Cyan #0284C7)
      const traj1 = distToSegment(nx, ny, 32, 63, 47, 53);
      const traj2 = distToSegment(nx, ny, 47, 53, 64, 48);
      const minTraj = Math.min(traj1, traj2);
      if (minTraj < 2.2) {
        const tA = Math.max(0, Math.min(1, (2.2 - minTraj) * scale));
        blend(2, 132, 199, tA);
      }

      // Start anchor node at (32, 63)
      const distNode = Math.hypot(nx - 32, ny - 63);
      if (distNode < 4.0) {
        const nA = Math.max(0, Math.min(1, (4.0 - distNode) * scale));
        blend(2, 132, 199, nA);
      }
      if (distNode < 2.0) {
        const nA = Math.max(0, Math.min(1, (2.0 - distNode) * scale));
        blend(255, 255, 255, nA);
      }

      // 5. Red Location Pin (at 47, 53)
      const pDist = distToPin(nx, ny);
      if (pDist <= 0.8) {
        const pA = Math.max(0, Math.min(1, (0.8 - pDist) * scale));
        blend(239, 68, 68, pA); // Red #EF4444
      }
      // Inner white dot in pin (at 47, 34.2)
      const distPinDot = Math.hypot(nx - 47, ny - 34.2);
      if (distPinDot < 2.8) {
        const dotA = Math.max(0, Math.min(1, (2.8 - distPinDot) * scale));
        blend(255, 255, 255, dotA);
      }

      // 6. Stylus Pen
      if (pointInPoly(nx, ny, penTip)) {
        blend(245, 158, 11, 1.0); // Gold tip
      }
      if (pointInPoly(nx, ny, penBarrel)) {
        blend(248, 250, 252, 1.0); // White barrel
      }
      // Pen border
      const pBorder = Math.min(
        distToSegment(nx, ny, 64, 48, 67, 45),
        distToSegment(nx, ny, 64, 48, 71, 49),
        distToSegment(nx, ny, 67, 45, 77, 35),
        distToSegment(nx, ny, 71, 49, 81, 39),
        distToSegment(nx, ny, 77, 35, 81, 39)
      );
      if (pBorder < 1.0) {
        blend(3, 105, 161, 0.9);
      }

      // Pen sparkle at tip (64, 48)
      const sparkH = distToSegment(nx, ny, 60, 48, 68, 48);
      const sparkV = distToSegment(nx, ny, 64, 44, 64, 52);
      const minSpark = Math.min(sparkH, sparkV);
      if (minSpark < 1.4) {
        const sA = Math.max(0, Math.min(1, (1.4 - minSpark) * scale));
        blend(252, 211, 77, sA);
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = Math.round(a * 255);
    }
  }

  return encodePng(size, size, buf);
}

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

  const launcherPng = renderIcon(t.iconSize, 'full_square');
  fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), launcherPng);

  const roundPng = renderIcon(t.iconSize, 'full_round');
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), roundPng);

  const fgPng = renderIcon(t.fgSize, 'foreground');
  fs.writeFileSync(path.join(dirPath, 'ic_launcher_foreground.png'), fgPng);

  console.log(`Updated icons for ${t.dir}: ic_launcher (${t.iconSize}x${t.iconSize}), foreground (${t.fgSize}x${t.fgSize})`);
}

console.log('All Android icons generated with GIS Royal Blue and Folded Map + Pen Theme!');
