/**
 * Rebuilds text-free PWA splashes, launcher icons, and app-icon-source.
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
