// Text-quote anchoring for highlights (task 031 D), after the W3C Web Annotation
// TextQuoteSelector: the quoted words plus a little context on each side, and
// the character offsets as a hint. Plain English is revised over time, so a
// highlight is found again by its words, not by its offsets; if the words are
// gone, the caller keeps the highlight and reports it, never drops it.

export type Quote = { exact: string; prefix: string; suffix: string; start: number };

export const CONTEXT = 32;

export function describe(text: string, start: number, end: number, context = CONTEXT): Quote {
  return {
    exact: text.slice(start, end),
    prefix: text.slice(Math.max(0, start - context), start),
    suffix: text.slice(end, end + context),
    start,
  };
}

/** How many characters a and b share at their ends (sharedEnd) or their starts (sharedStart). */
function sharedEnd(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}
function sharedStart(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

/**
 * Where the quote is now: every occurrence of the exact words, scored by how
 * much of the prefix and suffix still match, ties broken by closeness to the
 * old offset. Null when the words no longer appear.
 */
export function locate(text: string, q: Quote): { start: number; end: number } | null {
  if (!q.exact) return null;
  let best: { start: number; score: number; distance: number } | null = null;
  for (let at = text.indexOf(q.exact); at !== -1; at = text.indexOf(q.exact, at + 1)) {
    const score =
      sharedEnd(text.slice(Math.max(0, at - q.prefix.length), at), q.prefix) +
      sharedStart(text.slice(at + q.exact.length), q.suffix);
    const distance = Math.abs(at - q.start);
    if (!best || score > best.score || (score === best.score && distance < best.distance))
      best = { start: at, score, distance };
  }
  return best && { start: best.start, end: best.start + q.exact.length };
}
