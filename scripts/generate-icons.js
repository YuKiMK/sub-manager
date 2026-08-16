// PWA用アイコンPNGを生成する (依存パッケージなし: zlibのみ)
// モチーフ: 重なったカード = 複数の契約をまとめている状態。前面のカードから円記号をくり抜く。
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.resolve(process.cwd(), "public", "icons");

/** 背景のグラデーション (アプリのテーマ色に合わせた紫) */
const GRADIENT_FROM = "#a78bfa";
const GRADIENT_TO = "#4c1d95";

/**
 * maskable用のセーフゾーン半径 (512基準)。
 * Androidはアイコンを円形などに切り抜くため、図形は中央80%に収める必要がある。
 */
const SAFE_RADIUS = 204;

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
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
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
/** 4x4のスーパーサンプリングで縁を滑らかにする */
const SS = 4;
const hex = (h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/**
 * 斜めの線形グラデーションに、左上からの柔らかい光沢を重ねた背景を作る。
 * 単色や単純なグラデーションだと平坦に見えるため、奥行きを足している。
 */
function createBackground(size) {
  const buf = Buffer.alloc(size * size * 4);
  const [r1, g1, b1] = hex(GRADIENT_FROM);
  const [r2, g2, b2] = hex(GRADIENT_TO);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = Math.min(1, (x / (size - 1)) * 0.45 + (y / (size - 1)) * 0.55);
      const distance = Math.hypot(x - size * 0.22, y - size * 0.16) / (size * 0.95);
      const gloss = Math.max(0, 1 - distance) ** 2 * 0.18;
      const i = (y * size + x) * 4;
      buf[i] = Math.round((r1 + (r2 - r1) * t) * (1 - gloss) + 255 * gloss);
      buf[i + 1] = Math.round((g1 + (g2 - g1) * t) * (1 - gloss) + 255 * gloss);
      buf[i + 2] = Math.round((b1 + (b2 - b1) * t) * (1 - gloss) + 255 * gloss);
      buf[i + 3] = 255;
    }
  }
  return buf;
}

/**
 * 各サブピクセルが図形の内側かを判定して色を合成する。
 *
 * @param color "#rrggbb"。`{ source: Buffer }` を渡すと、その画像の同じ位置の色で塗る
 *              (白いカードから円記号をくり抜き、背景を覗かせるために使う)
 * @param inside (x, y) => boolean
 */
function paint(buf, size, color, alpha, bounds, inside) {
  const fromSource = typeof color === "object";
  const rgb = fromSource ? null : hex(color);
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
      const [r, g, b] = fromSource
        ? [color.source[i], color.source[i + 1], color.source[i + 2]]
        : rgb;
      buf[i] = Math.round(buf[i] * (1 - a) + r * a);
      buf[i + 1] = Math.round(buf[i + 1] * (1 - a) + g * a);
      buf[i + 2] = Math.round(buf[i + 2] * (1 - a) + b * a);
    }
  }
}

/** 太さのある線分の集合に触れているか (両端は丸) */
function nearSegments(px, py, segments) {
  for (const s of segments) {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const lengthSq = dx * dx + dy * dy || 1;
    let t = ((px - s.x1) * dx + (py - s.y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const qx = s.x1 + t * dx - px;
    const qy = s.y1 + t * dy - py;
    if (qx * qx + qy * qy <= (s.w / 2) ** 2) return true;
  }
  return false;
}

function segmentBounds(segments) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of segments) {
    x0 = Math.min(x0, s.x1 - s.w, s.x2 - s.w);
    x1 = Math.max(x1, s.x1 + s.w, s.x2 + s.w);
    y0 = Math.min(y0, s.y1 - s.w, s.y2 - s.w);
    y1 = Math.max(y1, s.y1 + s.w, s.y2 + s.w);
  }
  return { x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 };
}

/**
 * 円記号(¥)を構成する線分を返す。
 * 上部のV字・縦棒・横棒2本。比率は一般的な字形に合わせてある。
 *
 * @param option 横棒の位置と太さの調整。小サイズでは2本の横棒が繋がって
 *               1本に見えてしまうため、間隔を広げて細くする用途で使う。
 */
function yenSegments(cx, cy, capHeight, stroke, option = {}) {
  const bar1 = option.bar1 ?? 0.15;
  const bar2 = option.bar2 ?? 0.32;
  const barRatio = option.barRatio ?? 0.88; // 横棒は少し細くして重く見せない

  const top = cy - capHeight / 2;
  const bottom = cy + capHeight / 2;
  const junction = top + capHeight * 0.46; // V字が交わる高さ
  const spread = capHeight * 0.34;         // V字の開き (片側)
  const barHalf = capHeight * 0.3;         // 横棒の長さ (片側)
  const thin = stroke * barRatio;

  return [
    { x1: cx - spread, y1: top, x2: cx, y2: junction, w: stroke },
    { x1: cx + spread, y1: top, x2: cx, y2: junction, w: stroke },
    { x1: cx, y1: junction, x2: cx, y2: bottom, w: stroke },
    { x1: cx - barHalf, y1: junction + capHeight * bar1, x2: cx + barHalf, y2: junction + capHeight * bar1, w: thin },
    { x1: cx - barHalf, y1: junction + capHeight * bar2, x2: cx + barHalf, y2: junction + capHeight * bar2, w: thin },
  ];
}

function drawYen(buf, size, color, cx, cy, capHeight, stroke, option) {
  const segments = yenSegments(cx, cy, capHeight, stroke, option);
  paint(buf, size, color, 1, segmentBounds(segments), (px, py) => nearSegments(px, py, segments));
}

/** 角丸長方形 (中心・傾き指定) */
function fillRoundedBox(buf, size, color, alpha, cx, cy, w, h, radius, angleDeg) {
  const angle = (-angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const reach = Math.hypot(w, h) / 2 + 2;

  paint(
    buf, size, color, alpha,
    { x0: cx - reach, x1: cx + reach, y0: cy - reach, y1: cy + reach },
    (px, py) => {
      // 判定を楽にするため、座標側を逆回転させて軸に揃える
      const dx = px - cx;
      const dy = py - cy;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      const qx = Math.abs(rx) - (w / 2 - radius);
      const qy = Math.abs(ry) - (h / 2 - radius);
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius <= 0;
    }
  );
}

// ---------------- アイコン本体 ----------------
/** カード1枚あたりの寸法 (512基準) */
const CARD = { w: 206, h: 262, radius: 32 };

/**
 * 重なったカードの配置。
 * 奥のカードほど薄く、少しずつ傾けて重なりを表す。
 */
const CARD_LAYERS = [
  { dx: 31, dy: -23, angle: 14, alpha: 0.22 },
  { dx: 16, dy: -12, angle: 7, alpha: 0.38 },
  { dx: -6, dy: 6, angle: 0, alpha: 1 },
];

/**
 * 32px 用の配置。
 *
 * 標準の配置をそのまま縮小すると、カードの重なりも円記号のくり抜きも潰れて
 * 判別できなくなる。そこでカードを2枚に減らして大きく取り、
 * 間に背景色の隙間を挟んで「2枚ある」ことを分からせる。
 *
 * ファビコンは切り抜かれないため、セーフゾーンの制約は受けない。
 */
const COMPACT = {
  back: { dx: 40, dy: -34, w: 244, h: 300, radius: 38, alpha: 0.5 },
  // 前面カードの下に敷く背景色の板。これが2枚のあいだの隙間になる
  gap: { dx: -6, dy: 4, w: 268, h: 324, radius: 46 },
  front: { dx: -18, dy: 16, w: 244, h: 300, radius: 38 },
  yen: { capHeight: 196, stroke: 38, bar1: 0.12, bar2: 0.38, barRatio: 0.78 },
};

/**
 * 標準の配置がセーフゾーンに収まるかを検算する。
 * カードの角(丸めた後の最遠点)が中心からどれだけ離れるかで判定する。
 */
function maxContentRadius() {
  const cornerX = CARD.w / 2 - CARD.radius;
  const cornerY = CARD.h / 2 - CARD.radius;
  const fromCardCenter = Math.hypot(cornerX, cornerY) + CARD.radius;
  return Math.max(...CARD_LAYERS.map((l) => Math.hypot(l.dx, l.dy) + fromCardCenter));
}

/**
 * アイコンを描く。
 *
 * @param size 出力サイズ
 * @param compact 32px 用の配置を使うか
 */
function drawIcon(size, compact) {
  const u = size / 512; // 512基準の座標系
  const background = createBackground(size);
  const buf = Buffer.from(background);
  const cx = size / 2;
  const cy = size / 2;
  const box = (spec, color, alpha) =>
    fillRoundedBox(
      buf, size, color, alpha,
      cx + spec.dx * u, cy + spec.dy * u,
      spec.w * u, spec.h * u, spec.radius * u, spec.angle ?? 0
    );

  if (compact) {
    box(COMPACT.back, "#ffffff", COMPACT.back.alpha);
    box(COMPACT.gap, { source: background }, 1);
    box(COMPACT.front, "#ffffff", 1);
    drawYen(
      buf, size, { source: background },
      cx + COMPACT.front.dx * u, cy + COMPACT.front.dy * u,
      COMPACT.yen.capHeight * u, COMPACT.yen.stroke * u, COMPACT.yen
    );
    return encodePng(size, buf);
  }

  for (const layer of CARD_LAYERS) {
    box({ ...CARD, ...layer }, "#ffffff", layer.alpha);
  }

  // 前面のカードからくり抜く。背景の色をそのまま拾うため、下の紫が覗いて見える
  const front = CARD_LAYERS[CARD_LAYERS.length - 1];
  drawYen(
    buf, size, { source: background },
    cx + front.dx * u, cy + front.dy * u,
    139 * u, 23 * u
  );

  return encodePng(size, buf);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const contentRadius = maxContentRadius();
if (contentRadius > SAFE_RADIUS) {
  console.error(`セーフゾーン超過: ${contentRadius.toFixed(1)} > ${SAFE_RADIUS}`);
  process.exit(1);
}
console.log(`セーフゾーン: ${contentRadius.toFixed(1)} / ${SAFE_RADIUS} (余裕 ${(SAFE_RADIUS - contentRadius).toFixed(1)})`);

const targets = [
  { size: 512, compact: false, name: "icon-512.png" },
  { size: 192, compact: false, name: "icon-192.png" },
  { size: 180, compact: false, name: "apple-icon.png" },
  // タブに出る小さなアイコン。潰れないよう配置を変える
  { size: 32, compact: true, name: "favicon-32.png" },
];

for (const { size, compact, name } of targets) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, drawIcon(size, compact));
  console.log(`生成: ${name} (${size}px, ${fs.statSync(file).size} bytes)`);
}
