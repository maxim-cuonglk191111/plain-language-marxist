// Where vocabulary terms are marked in the text (tasks 010, 022). Shared by the
// renderer (LayoutText) and the concordance (task 032 B), so "where this term
// appears" counts exactly the marks a reader sees.
import type { TermFile } from "@plm/schema";

export type Range = { start: number; end: number; term: string };
export const WORD = /[\p{L}\p{N}]/u;

export const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Character ranges of annotations in the concatenated text nodes (whole words, nth occurrence). */
export function annotationRanges(
  text: string,
  annotations: readonly { term: string; match: string; occurrence: number }[],
): Range[] {
  const ranges: Range[] = [];
  for (const a of annotations) {
    let seen = 0;
    for (let i = text.indexOf(a.match); i !== -1; i = text.indexOf(a.match, i + 1)) {
      if (WORD.test(text[i - 1] ?? "") || WORD.test(text[i + a.match.length] ?? "")) continue;
      if (++seen === a.occurrence) {
        ranges.push({ start: i, end: i + a.match.length, term: a.term });
        break;
      }
    }
  }
  return ranges.sort((x, y) => x.start - y.start);
}

export type Surface = { match: string; term: string };
const surfaceCache = new WeakMap<ReadonlyMap<string, TermFile>, Surface[]>();

/**
 * Words of terms kept as written (one rendering, so no token): in Plain English
 * they appear as ordinary words, and are marked so their cards open too (task 022).
 * Longest first, so "means of production" wins over a shorter term inside it.
 */
export function keptSurfaces(vocabulary: ReadonlyMap<string, TermFile>): Surface[] {
  const cached = surfaceCache.get(vocabulary);
  if (cached) return cached;
  const out: Surface[] = [];
  for (const t of vocabulary.values()) {
    const renderings = Object.values(t.renderings);
    if (renderings.length !== 1 || !renderings[0]) continue;
    for (const w of new Set([...Object.values(renderings[0].forms), ...(t.aliases ?? [])])) {
      out.push({ match: w, term: t.term });
      if (capitalizeFirst(w) !== w) out.push({ match: capitalizeFirst(w), term: t.term });
    }
  }
  out.sort((a, b) => b.match.length - a.match.length);
  surfaceCache.set(vocabulary, out);
  return out;
}

/** Whole-word occurrences of kept terms in a plain text segment, in text order, never overlapping. */
export function findKept(value: string, surfaces: readonly Surface[]): Range[] {
  const found: Range[] = [];
  for (const s of surfaces) {
    for (let i = value.indexOf(s.match); i !== -1; i = value.indexOf(s.match, i + 1)) {
      const end = i + s.match.length;
      if (WORD.test(value[i - 1] ?? "") || WORD.test(value[end] ?? "")) continue;
      if (found.some((r) => i < r.end && end > r.start)) continue;
      found.push({ start: i, end, term: s.term });
    }
  }
  return found.sort((a, b) => a.start - b.start);
}
