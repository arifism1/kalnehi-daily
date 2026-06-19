import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { buildGoldenMaster } from "./goldenScenarios";

const dir = dirname(fileURLToPath(import.meta.url));
const snapshotPath = join(dir, "goldenMaster.snapshot.json");

/**
 * PARITY GATE. The snapshot was captured from Kalnehi BEFORE the engine extraction.
 * If this fails after extraction, the engine math diverged from the original Kalnehi
 * behavior — fix the engine, do NOT regenerate the snapshot.
 */
describe("golden master parity (Kalnehi engine math)", () => {
  const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as unknown;

  it("matches the committed pre-extraction snapshot exactly", () => {
    assert.deepStrictEqual(buildGoldenMaster(), snapshot);
  });
});
