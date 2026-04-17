/**
 * Regenerates PWA launcher icons from the master asset with padding so content
 * stays inside the ~80% maskable safe circle (see web.dev/maskable-icon).
 *
 * Source: public/app-icon-source.png — full-bleed master; outputs add safe-zone padding.
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
