// PWA用アイコンPNGを生成する (依存パッケージなし: zlibのみ)
// モチーフ: 「繰り返し課金される円」= 円記号 + 周回する矢印
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.resolve(process.cwd(), "public", "icons");

// ---------------- PNGエンコーダ ----------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------- 描画基盤 ----------------
/** 3x3のスーパーサンプリングで縁を滑らかにする */
const SS = 3;
const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

function createCanvas(size, topColor, bottomColor) {
  const buf = Buffer.alloc(size * size * 4);
  const [r1, g1, b1] = hex(topColor);
  const [r2, g2, b2] = hex(bottomColor);
  for (let y = 0; y < size; y++) {
    // 斜めのグラデーションにして単調さを避ける
    for (let x = 0; x < size; x++) {
      const t = (y / (size - 1)) * 0.75 + (x / (size - 1)) * 0.25;
      const i = (y * size + x) * 4;
      buf[i] = Math.round(r1 + (r2 - r1) * t);
      buf[i + 1] = Math.round(g1 + (g2 - g1) * t);
      buf[i + 2] = Math.round(b1 + (b2 - b1) * t);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/**
 * 各ピクセルを覆っているかを判定する関数を受け取り、色を合成する。
 * @param inside (x, y) => boolean  サブピクセル座標が図形の内側か
 */
function paint(buf, size, color, alpha, bounds, inside) {
  const [r, g, b] = hex(color);
  const x0 = Math.max(0, Math.floor(bounds.x0));
  const x1 = Math.min(size, Math.ceil(bounds.x1));
  const y0 = Math.max(0, Math.floor(bounds.y0));
  const y1 = Math.min(size, Math.ceil(bounds.y1));

  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      let hits = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          if (inside(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS)) hits++;
        }
      }
      if (!hits) continue;
      const a = (hits / (SS * SS)) * alpha;
      const i = (py * size + px) * 4;
      buf[i] = Math.round(buf[i] * (1 - a) + r * a);
      buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a);
      buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a);
    }
  }
}

/** 太さのある線分 (両端は丸) */
function strokeLine(buf, size, x1, y1, x2, y2, width, color, alpha = 1) {
  const half = width / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy || 1;

  paint(
    buf, size, color, alpha,
    {
      x0: Math.min(x1, x2) - half - 1, x1: Math.max(x1, x2) + half + 1,
      y0: Math.min(y1, y2) - half - 1, y1: Math.max(y1, y2) + half + 1,
    },
    (px, py) => {
      // 線分への最短距離
      let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const cx = x1 + t * dx;
      const cy = y1 + t * dy;
      return (px - cx) ** 2 + (py - cy) ** 2 <= half * half;
    }
  );
}

/** 円弧 (角度は度、時計回りではなく数学的な向き) */
function strokeArc(buf, size, cx, cy, radius, thickness, startDeg, endDeg, color, alpha = 1) {
  const inner = radius - thickness / 2;
  const outer = radius + thickness / 2;
  const start = (startDeg * Math.PI) / 180;
  const end = (endDeg * Math.PI) / 180;

  paint(
    buf, size, color, alpha,
    { x0: cx - outer - 1, x1: cx + outer + 1, y0: cy - outer - 1, y1: cy + outer + 1 },
    (px, py) => {
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < inner || dist > outer) return false;

      let angle = Math.atan2(dy, dx);
      // start..end の範囲へ正規化して判定する
      let a = angle - start;
      while (a < 0) a += Math.PI * 2;
      let span = end - start;
      while (span < 0) span += Math.PI * 2;
      return a <= span;
    }
  );
}

/** 三角形 (矢印の先端に使う) */
function fillTriangle(buf, size, points, color, alpha = 1) {
  const [ax, ay, bx, by, cx, cy] = points;
  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);

  paint(
    buf, size, color, alpha,
    {
      x0: Math.min(ax, bx, cx) - 1, x1: Math.max(ax, bx, cx) + 1,
      y0: Math.min(ay, by, cy) - 1, y1: Math.max(ay, by, cy) + 1,
    },
    (px, py) => {
      const d1 = sign(px, py, ax, ay, bx, by);
      const d2 = sign(px, py, bx, by, cx, cy);
      const d3 = sign(px, py, cx, cy, ax, ay);
      const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
      const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
      return !(hasNeg && hasPos);
    }
  );
}

/**
 * 円記号 (¥) を描く。
 * 上部のV字 + 縦棒 + 2本の横棒 という字形をそのまま線分で構成する。
 */
function drawYen(buf, size, cx, cy, capHeight, stroke, color) {
  const top = cy - capHeight / 2;
  const bottom = cy + capHeight / 2;
  const junction = top + capHeight * 0.44; // V字が交わる位置
  const armSpread = capHeight * 0.36;
  const barHalf = capHeight * 0.32;

  // V字
  strokeLine(buf, size, cx - armSpread, top, cx, junction, stroke, color);
  strokeLine(buf, size, cx + armSpread, top, cx, junction, stroke, color);
  // 縦棒
  strokeLine(buf, size, cx, junction, cx, bottom, stroke, color);
  // 横棒2本
  strokeLine(buf, size, cx - barHalf, junction + capHeight * 0.16, cx + barHalf, junction + capHeight * 0.16, stroke, color);
  strokeLine(buf, size, cx - barHalf, junction + capHeight * 0.34, cx + barHalf, junction + capHeight * 0.34, stroke, color);
}

/**
 * アイコン本体。
 * maskable対応のため、図形は中央80%のセーフゾーン内に収める。
 *
 * @param size 出力サイズ
 * @param withRing 周回する矢印を描くか (小サイズでは省いて視認性を優先)
 */
function drawIcon(size, withRing) {
  const u = size / 512; // 512基準の座標系
  const buf = createCanvas(size, "#a78bfa", "#5b21b6");
  const cx = size / 2;
  const cy = size / 2;
  const white = "#ffffff";

  if (withRing) {
    // maskableのセーフゾーン(中央80% = 半径204/512)に矢印の角まで収める
    const radius = 176 * u;
    const thickness = 20 * u;
    const startDeg = 300;
    const endDeg = 240; // 上部に60度の隙間を残し、そこへ矢印を向ける

    // 周回を表す円弧 (画面座標なので角度が増える向き = 時計回り)
    strokeArc(buf, size, cx, cy, radius, thickness, startDeg, endDeg, white, 0.95);

    // 円弧の終端に接する矢印。進行方向(接線)へ尖らせて輪が閉じるように見せる
    const end = (endDeg * Math.PI) / 180;
    const radial = { x: Math.cos(end), y: Math.sin(end) };
    const tangent = { x: -Math.sin(end), y: Math.cos(end) };
    const headLength = 52 * u;
    const headHalfWidth = 27 * u;

    fillTriangle(
      buf, size,
      [
        // 先端
        cx + radial.x * radius + tangent.x * headLength,
        cy + radial.y * radius + tangent.y * headLength,
        // 外側の角
        cx + radial.x * (radius + headHalfWidth),
        cy + radial.y * (radius + headHalfWidth),
        // 内側の角
        cx + radial.x * (radius - headHalfWidth),
        cy + radial.y * (radius - headHalfWidth),
      ],
      white, 0.95
    );
  }

  drawYen(buf, size, cx, cy, withRing ? 196 * u : 300 * u, (withRing ? 30 : 44) * u, white);

  return encodePng(size, buf);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { size: 512, withRing: true, name: "icon-512.png" },
  { size: 192, withRing: true, name: "icon-192.png" },
  { size: 180, withRing: true, name: "apple-icon.png" },
  // 32pxでは円弧が潰れるため、円記号だけにして輪郭を保つ
  { size: 32, withRing: false, name: "favicon-32.png" },
];

for (const { size, withRing, name } of targets) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, drawIcon(size, withRing));
  console.log(`生成: ${name} (${size}px, ${fs.statSync(file).size} bytes)`);
}
