import { describe, expect, it } from "vitest";
import { estimate, timeLeft, visibleWords, type RowCount } from "./progress";

const rows: [RowCount, RowCount, RowCount] = [
  { words: [100, 120, 0], untranslated: false },
  { words: [0, 80, 40], untranslated: true },
  { words: [200, 220, 60], untranslated: false },
];

describe("visibleWords", () => {
  it("counts the layers that are on", () => {
    expect(visibleWords(rows[0], ["plain"])).toBe(100);
    expect(visibleWords(rows[0], ["plain", "original"])).toBe(220);
    expect(visibleWords(rows[2], ["plain", "original", "context"])).toBe(480);
  });

  it("counts the Original of an untranslated row when Plain English shows it instead", () => {
    expect(visibleWords(rows[1], ["plain"])).toBe(80);
    expect(visibleWords(rows[1], ["plain", "original"])).toBe(80);
    expect(visibleWords(rows[1], ["context"])).toBe(40);
  });
});

describe("estimate", () => {
  it("is 0% at the top and counts every visible word as left", () => {
    expect(estimate(rows, ["plain"], 0, 0)).toEqual({ percent: 0, wordsLeft: 380 });
  });

  it("adds the read share of the current row", () => {
    // 100 + 80 + half of 200 = 280 of 380.
    expect(estimate(rows, ["plain"], 2, 0.5)).toEqual({ percent: 74, wordsLeft: 100 });
  });

  it("reaches 100% at the end of the last row", () => {
    expect(estimate(rows, ["original"], 2, 1)).toEqual({ percent: 100, wordsLeft: 0 });
  });

  it("clamps out-of-range positions and handles empty chapters", () => {
    expect(estimate(rows, ["plain"], 99, 2).percent).toBe(100);
    expect(estimate([], ["plain"], 0, 0)).toEqual({ percent: 0, wordsLeft: 0 });
  });
});

describe("timeLeft", () => {
  it("rounds to whole minutes at the chosen speed", () => {
    expect(timeLeft(1800, 200)).toBe("about 9 min left");
    expect(timeLeft(1800, 300)).toBe("about 6 min left");
  });

  it("says when less than a minute or nothing is left", () => {
    expect(timeLeft(50, 200)).toBe("less than a minute left");
    expect(timeLeft(0, 200)).toBe("finished");
  });
});
