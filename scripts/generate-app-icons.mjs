/**
 * Regenerates PWA launcher icons from the master asset with padding so content
 * stays inside the ~80% maskable safe circle (see web.dev/maskable-icon).
 *
 * Source: public/app-icon-source.png — full-bleed master; outputs add safe-zone padding.
 * On each run, near-white plate pixels (RGB ≥ 249) are written transparent on the source
 * so the mark matches manifest cream without an inner #FFF square.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "public/app-icon-source.png");

/** theme background_color from manifest — opaque tile behind the mark */
const BG = { r: 250, g: 247, b: 242, alpha: 1 };

/** Fits the full-bleed square inside the usual maskable safe circle (~80% diameter). */
const CONTENT_SCALE = 0.56;

/**
 * Removes an opaque near-white plate (common export from design tools) so the mark
 * can sit on manifest `background_color` / header glass without a #FFF square.
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

async function paddedSquare(size) {
  const inner = Math.max(1, Math.round(size * CONTENT_SCALE));
  const srcBuf = readFileSync(SRC);
  const resized = await sharp(srcBuf)
    .resize(inner, inner, { fit: "fill" })
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

async function main() {
  const raw = readFileSync(SRC);
  const normalized = await stripNearWhitePlatePng(raw);
  writeFileSync(SRC, normalized);

  const [b512, b192, b180, b192m] = await Promise.all([
    paddedSquare(512),
    paddedSquare(192),
    paddedSquare(180),
    paddedSquare(192),
  ]);

  writeFileSync(join(ROOT, "public/icon-maskable-512.png"), b512);
  writeFileSync(join(ROOT, "public/icon-512x512.png"), b512);
  writeFileSync(join(ROOT, "public/icon-192x192.png"), b192);
  writeFileSync(join(ROOT, "public/apple-touch-icon.png"), b180);
  writeFileSync(join(ROOT, "public/icon-maskable-192.png"), b192m);

  const meta = await sharp(b512).metadata();
  console.log("Wrote launcher icons:", {
    scale: CONTENT_SCALE,
    channels: meta.channels,
    space: meta.space,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
