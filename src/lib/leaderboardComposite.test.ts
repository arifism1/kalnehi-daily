import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  computeLeaderboardComposite,
  LEADERBOARD_HOURS_WEEK_CAP,
  topPercentFromRankAndSize,
} from "./leaderboardComposite";

describe("computeLeaderboardComposite", () => {
  it("returns 0 when both inputs are 0", () => {
    assert.equal(computeLeaderboardComposite(0, 0), 0);
  });

  it("maps full hours cap and 100% syllabus to 100", () => {
    const v = computeLeaderboardComposite(LEADERBOARD_HOURS_WEEK_CAP, 100);
    assert.equal(v, 100);
  });

  it("is symmetric at default 0.5 weight for half of each", () => {
    const halfHours = LEADERBOARD_HOURS_WEEK_CAP / 2;
    const v = computeLeaderboardComposite(halfHours, 50);
    assert.equal(v, 50);
  });
});

describe("topPercentFromRankAndSize", () => {
  it("returns null for cohort below minimum", () => {
    assert.equal(topPercentFromRankAndSize(1, 10), null);
  });

  it("gives top 1% for best in cohort of 100", () => {
    assert.equal(topPercentFromRankAndSize(1, 100), 1);
  });

  it("gives top 23% for 23rd of 100", () => {
    assert.equal(topPercentFromRankAndSize(23, 100), 23);
  });

  it("ties at rank: rank 1 and 2 both top 1% in 200", () => {
    assert.equal(topPercentFromRankAndSize(1, 200), 1);
    assert.equal(topPercentFromRankAndSize(2, 200), 1);
  });
});
