/**
 * PWA launcher icons: wordmark (transparent on white) from public/brand/launcher-source.png.
 * Splashes: navy + orange brand dot (separate from app icon look).
 * Run: node scripts/rebuild-pwa-assets.mjs
 *   or: node scripts/rebuild-pwa-assets.mjs --icons  (icons + source only, no splashes)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public/app-icon-source.png");
/** Master 1024× design — edit this file, then re-run the script. */
const LAUNCHER_SOURCE = join(ROOT, "public/brand/launcher-source.png");

const BRAND_HEX = "#FF7A00";
const NAVY_HEX = "#0f172a";

/** Launcher tile — white, matches the wordmark reference. */
const BG = { r: 255, g: 255, b: 255, alpha: 1 };

/** How large the (square) mark is inside each output tile. ~0.8 keeps clear of maskable safe zone. */
const CONTENT_SCALE = 0.84;

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

/** Normalize master to 1024×1024 square PNG. */
async function loadLauncherSourcePng() {
  const buf = readFileSync(LAUNCHER_SOURCE);
  return sharp(buf)
    .resize(1024, 1024, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function paddedSquare(size, markBuf) {
  const inner = Math.max(1, Math.round(size * CONTENT_SCALE));
  const resized = await sharp(markBuf)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
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
  [1290, 2796],
  [1170, 2532],
  [1284, 2778],
  [1242, 2688],
  [828, 1792],
  [750, 1334],
  [1536, 2048],
  [1668, 2388],
  [2048, 2732],
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
  const markRaw = await loadLauncherSourcePng();
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
    icons: "public/app-icon-source.png + icon-*.png + apple-touch-icon.png",
    splashes: splashes ? "public/splash/apple-*.png" : "skipped",
  });
}
