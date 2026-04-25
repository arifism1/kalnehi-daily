/**
 * @deprecated in favor of `node scripts/rebuild-pwa-assets.mjs --icons` — kept for npm `generate:icons`.
 */
import { runPwaAssetBuild } from "./pwa-assets.mjs";

runPwaAssetBuild({ splashes: false }).catch((e) => {
  console.error(e);
  process.exit(1);
});
