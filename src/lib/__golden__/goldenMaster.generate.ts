/**
 * Regenerates the golden-master snapshot. Run ONCE before extraction (and only
 * intentionally afterwards, when a behavior change is reviewed and expected):
 *
 *   node --import tsx src/lib/__golden__/goldenMaster.generate.ts
 *
 * Never regenerate to "make the test pass" during extraction — a diff there means
 * the engine math drifted and Kalnehi parity is broken.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildGoldenMaster } from "./goldenScenarios";

const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, "goldenMaster.snapshot.json");
writeFileSync(out, `${JSON.stringify(buildGoldenMaster(), null, 2)}\n`);
// eslint-disable-next-line no-console
console.log(`golden-master snapshot written: ${out}`);
