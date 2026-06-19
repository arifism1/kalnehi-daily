import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyVerticalFilter, stampVertical } from "./withVertical";

describe("stampVertical", () => {
  it("stamps a single row without mutating the input", () => {
    const input = { user_id: "u1", amount: 100 };
    const out = stampVertical(input, "fizaki");
    assert.deepEqual(out, { user_id: "u1", amount: 100, vertical: "fizaki" });
    assert.equal("vertical" in input, false, "input must not be mutated");
  });

  it("stamps every row in an array", () => {
    const out = stampVertical([{ a: 1 }, { a: 2 }], "kalnehi");
    assert.deepEqual(out, [
      { a: 1, vertical: "kalnehi" },
      { a: 2, vertical: "kalnehi" },
    ]);
  });

  it("overrides any pre-existing vertical (server-authoritative)", () => {
    const out = stampVertical({ vertical: "kalnehi", x: 1 }, "fizaki");
    assert.equal(out.vertical, "fizaki");
  });
});

describe("applyVerticalFilter", () => {
  it("appends .eq('vertical', <id>) to the query", () => {
    const calls: [string, string][] = [];
    const fakeQuery = {
      eq(col: string, val: string) {
        calls.push([col, val]);
        return this;
      },
    };
    const result = applyVerticalFilter(fakeQuery, "fizaki");
    assert.equal(result, fakeQuery);
    assert.deepEqual(calls, [["vertical", "fizaki"]]);
  });
});
