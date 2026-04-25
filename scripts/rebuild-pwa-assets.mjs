/**
 * Rebuilds PWA splashes, launcher icons (from public/brand/launcher-source.png), and app-icon-source.
 * Usage:
 *   node scripts/rebuild-pwa-assets.mjs           — full (icons + splashes)
 *   node scripts/rebuild-pwa-assets.mjs --icons   — icons + source only
 */
import { runPwaAssetBuild } from "./pwa-assets.mjs";

const iconsOnly = process.argv.includes("--icons");

runPwaAssetBuild({ splashes: !iconsOnly }).catch((e) => {
  console.error(e);
  process.exit(1);
});
