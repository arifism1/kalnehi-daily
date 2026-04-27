/**
 * PWA launcher icons: wordmark from `public/brand/launcher-source.png` on cream; navy splashes.
 * Run: node scripts/rebuild-pwa-assets.mjs
 *   or: node scripts/rebuild-pwa-assets.mjs --icons  (icons + source only, no splashes)
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
/** Square master (white or near-white plate); upscaled to 1024 for crisp 192/512 exports. */
const BRAND_SOURCE = join(ROOT, "public/brand/launcher-source.png");
/** Written on each `generate:icons` run — 1024×1024, matches pipeline input. */
const SRC = join(ROOT, "public/app-icon-source.png");

const BRAND_HEX = "#FF7A00";
const NAVY_HEX = "#0f172a";

/** theme background for launcher tiles — matches src/app/manifest.ts */
const BG = { r: 250, g: 247, b: 242, alpha: 1 };

const MASTER_SIZE = 1024;

/**
 * Fraction of the output square occupied by the wordmark (max side of contained bitmap).
 * Keep below ~0.65 so edge-to-edge source art still clears maskable / adaptive “safe”
 * zones (roughly the central 80% circle) on circle and squircle launchers — not zoomed in.
 */
const CONTENT_SCALE = 0.62;

/**
 * Strips a near-opaque "plate" (RGB ≥ 249) so a transparent + mark source composites cleanly.
 * Does not write back to disk — in-memory only.
 */
async function stripNearWhitePlatePng(buf, { minRgb = 249 } = {}) {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= minRgb && g >= minRgb && b >= minRgb) {
      data[i + 3] = 0;
    }
  }
  return sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** 1024×1024 PNG from the brand file — aspect preserved (no stretch), then Lanczos. */
async function readBrandMasterPng() {
  if (!existsSync(BRAND_SOURCE)) {
    throw new Error(
      `Missing ${BRAND_SOURCE}. Add a square PNG (white or near-white background) for the PWA wordmark.`
    );
  }
  const buf = readFileSync(BRAND_SOURCE);
  return sharp(buf)
    .resize(MASTER_SIZE, MASTER_SIZE, {
      fit: "contain",
      background: BG,
      kernel: sharp.kernel.lanczos3,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function paddedSquare(size, markBuf) {
  const inner = Math.max(1, Math.round(size * CONTENT_SCALE));
  const resized = await sharp(markBuf)
    .resize(inner, inner, {
      fit: "contain",
      background: { ...BG, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .ensureAlpha()
    .toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Apple startup images — must match src/app/layout.tsx `appleStartupImages` */
const SPLASH_SIZES = [
  // ── iPhone (newest first) ──────────────────────────────────────────────────
  [1320, 2868], // iPhone 16 Pro Max      440×956 @3x
  [1206, 2622], // iPhone 16 Pro          402×874 @3x
  [1290, 2796], // iPhone 16 Plus / 15 Pro Max / 14 Pro Max  430×932 @3x
  [1179, 2556], // iPhone 16 / 15 / 15 Pro / 14 Pro  393×852 @3x
  [1170, 2532], // iPhone 14 / 13 / 12    390×844 @3x
  [1284, 2778], // iPhone 13 Pro Max / 12 Pro Max  428×926 @3x
  [1242, 2688], // iPhone XS Max / 11 Pro Max  414×896 @3x
  [828, 1792],  // iPhone XR / 11         414×896 @2x
  [750, 1334],  // iPhone SE / 8          375×667 @2x
  // ── iPad ──────────────────────────────────────────────────────────────────
  [2064, 2752], // iPad Pro 13" M4        1032×1376 @2x
  [2048, 2732], // iPad Pro 12.9" (prev) / Air 13"  1024×1366 @2x
  [1668, 2388], // iPad Pro 11"           834×1194 @2x
  [1640, 2360], // iPad Air 11" M2/M3     820×1180 @2x
  [1488, 2266], // iPad mini 6            744×1133 @2x
  [1536, 2048], // iPad (standard)        768×1024 @2x
];

function splashFilename(w, h) {
  return `apple-${w}x${h}.png`;
}

async function writeSplashPng(w, h) {
  const r = Math.max(1, Math.round(0.12 * Math.min(w, h)));
  const cx = w / 2;
  const cy = h / 2;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${NAVY_HEX}"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${BRAND_HEX}"/>
</svg>`;
  const out = join(ROOT, "public", "splash", splashFilename(w, h));
  const buf = await sharp(Buffer.from(svg))
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(out, buf);
}

export async function buildIcons() {
  const markRaw = await readBrandMasterPng();
  writeFileSync(SRC, markRaw);

  const toUse = await stripNearWhitePlatePng(markRaw);

  const [b512, b192, b180, b192m] = await Promise.all([
    paddedSquare(512, toUse),
    paddedSquare(192, toUse),
    paddedSquare(180, toUse),
    paddedSquare(192, toUse),
  ]);

  writeFileSync(join(ROOT, "public/icon-maskable-512.png"), b512);
  writeFileSync(join(ROOT, "public/icon-512x512.png"), b512);
  writeFileSync(join(ROOT, "public/icon-192x192.png"), b192);
  writeFileSync(join(ROOT, "public/apple-touch-icon.png"), b180);
  writeFileSync(join(ROOT, "public/icon-maskable-192.png"), b192m);
}

export async function buildSplashes() {
  for (const [w, h] of SPLASH_SIZES) {
    await writeSplashPng(w, h);
  }
}

export async function runPwaAssetBuild({ splashes = true } = {}) {
  await buildIcons();
  if (splashes) {
    await buildSplashes();
  }
  console.log("PWA assets OK:", {
    icons: "public/brand/launcher-source.png → app-icon-source.png + icon-*.png + apple-touch-icon.png",
    splashes: splashes ? "public/splash/apple-*.png" : "skipped",
  });
}
