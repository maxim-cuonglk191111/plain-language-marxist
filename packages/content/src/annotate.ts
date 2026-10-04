import type { OriginalTermsFile, Passage, TermFile } from "@plm/schema";
import { plainText } from "./hash.ts";

type Annotation = OriginalTermsFile["annotations"][number];

const WORD_CHAR = /[\p{L}\p{N}]/u;
const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Start offsets of whole-word occurrences of `needle` in `text`. */
function wholeWordOffsets(text: string, needle: string): number[] {
  const out: number[] = [];
  for (let i = text.indexOf(needle); i !== -1; i = text.indexOf(needle, i + 1)) {
    if (!WORD_CHAR.test(text[i - 1] ?? "") && !WORD_CHAR.test(text[i + needle.length] ?? "")) out.push(i);
  }
  return out;
}

export type TermSurface = { term: string; match: string };

/** Every word or phrase that names a term (forms and aliases, also capitalised), longest first. */
export function termSurfaces(terms: Iterable<TermFile>): TermSurface[] {
  const surfaces: TermSurface[] = [];
  for (const term of terms) {
    const words = new Set([...Object.values(term.original), ...(term.aliases ?? [])]);
    for (const w of words) {
      surfaces.push({ term: term.term, match: w });
      if (capitalizeFirst(w) !== w) surfaces.push({ term: term.term, match: capitalizeFirst(w) });
    }
  }
  return surfaces.sort((a, b) => b.match.length - a.match.length);
}

export type TermRange = { start: number; end: number; term: string };

/**
 * Whole-word term ranges in a plain string, without overlaps (longer matches
 * win). Terms in `skip` are not marked; with `firstOnly`, each term is marked
 * once and added to `skip`, so a card links a term at its first mention only.
 */
export function findTermRanges(
  text: string,
  surfaces: readonly TermSurface[],
  options: { skip?: Set<string>; firstOnly?: boolean } = {},
): TermRange[] {
  const skip = options.skip ?? new Set<string>();
  // Skipped terms still claim their text, so "bourgeois" inside a skipped
  // "petty bourgeois" is not marked as a term of its own.
  const found: TermRange[] = [];
  for (const s of surfaces) {
    for (const at of wholeWordOffsets(text, s.match)) {
      const end = at + s.match.length;
      if (found.some((r) => at < r.end && end > r.start)) continue;
      found.push({ start: at, end, term: s.term });
    }
  }
  found.sort((a, b) => a.start - b.start);
  const kept: TermRange[] = [];
  for (const r of found) {
    if (skip.has(r.term)) continue;
    if (options.firstOnly) skip.add(r.term);
    kept.push(r);
  }
  return kept;
}

/**
 * Annotates whole-word occurrences of every term's original forms and aliases
 * in a document's active passages (SDD §5.5). Existing annotations are kept
 * as they are; only missing ones are added. Longer matches win over shorter
 * ones they contain (e.g. "means of social production" over "production").
 */
export function annotatePassages(
  passages: readonly Passage[],
  terms: readonly TermFile[],
  existing: readonly Annotation[] = [],
): { annotations: Annotation[]; added: number } {
  const surfaces = termSurfaces(terms);

  const key = (a: Annotation) => `${a.passage}|${a.match}|${a.occurrence}`;
  const seen = new Set(existing.map(key));
  const result: Annotation[] = [...existing];
  let added = 0;

  for (const p of passages) {
    if (p.state !== "active") continue;
    const text = plainText(p.text) ?? "";
    const taken: [number, number][] = [];
    const found: { at: number; annotation: Annotation }[] = [];
    for (const s of surfaces) {
      wholeWordOffsets(text, s.match).forEach((at, index) => {
        const end = at + s.match.length;
        if (taken.some(([a, b]) => at < b && end > a)) return;
        taken.push([at, end]);
        found.push({ at, annotation: { passage: p.id, term: s.term, match: s.match, occurrence: index + 1 } });
      });
    }
    for (const { annotation } of found.sort((a, b) => a.at - b.at)) {
      if (seen.has(key(annotation))) continue;
      seen.add(key(annotation));
      result.push(annotation);
      added++;
    }
  }
  return { annotations: result, added };
}
