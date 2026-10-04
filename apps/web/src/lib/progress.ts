// How far through a chapter the reader is, and how long is left (task 031, Part A).
// Pure, so it is unit-tested; the reader feeds it per-row word counts computed
// at build time (data-words on each row) and the layers currently shown.

import type { Layer } from "./layers";

export type RowCount = {
  /** Words in Plain English, Original, Context. */
  words: readonly [number, number, number];
  /** No Plain English yet: with Plain English alone, the Original shows instead. */
  untranslated: boolean;
};

/** Words a reader sees in one row with these layers on. */
export function visibleWords(row: RowCount, layers: readonly Layer[]): number {
  const [plain, original, context] = row.words;
  const on = (l: Layer) => layers.includes(l);
  let n = 0;
  if (on("original") || (on("plain") && row.untranslated)) n += original;
  if (on("plain") && !row.untranslated) n += plain;
  if (on("context")) n += context;
  return n;
}

export type Estimate = { percent: number; wordsLeft: number };

/**
 * Position as a share of the words shown: everything in rows before `index`,
 * plus `fraction` (0–1) of row `index` itself.
 */
export function estimate(
  rows: readonly RowCount[],
  layers: readonly Layer[],
  index: number,
  fraction: number,
): Estimate {
  const counts = rows.map((r) => visibleWords(r, layers));
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0 || rows.length === 0) return { percent: 0, wordsLeft: 0 };
  const i = Math.min(Math.max(index, 0), rows.length - 1);
  const f = Math.min(Math.max(fraction, 0), 1);
  const read = counts.slice(0, i).reduce((a, b) => a + b, 0) + (counts[i] ?? 0) * f;
  return { percent: Math.round((read / total) * 100), wordsLeft: Math.round(total - read) };
}

/** "about 9 min left", "less than a minute left". */
export function timeLeft(wordsLeft: number, wpm: number): string {
  const min = wordsLeft / Math.max(wpm, 1);
  if (min < 1) return wordsLeft > 0 ? "less than a minute left" : "finished";
  return `about ${Math.round(min)} min left`;
}
