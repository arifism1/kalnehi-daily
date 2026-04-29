/**
 * Rebuilds PWA splashes, launcher icons (from public/brand/launcher-source.png),
 * Android mipmap launcher PNGs (adaptive + legacy), and app-icon-source.
 * Usage:
 *   node scripts/rebuild-pwa-assets.mjs           — full (icons + splashes + Android mipmaps)
 *   node scripts/rebuild-pwa-assets.mjs --icons   — icons + Android mipmaps + source only (no splashes)
 */
import { runPwaAssetBuild } from "./pwa-assets.mjs";

const iconsOnly = process.argv.includes("--icons");

runPwaAssetBuild({ splashes: !iconsOnly }).catch((e) => {
  console.error(e);
  process.exit(1);
});
