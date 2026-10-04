// Shared by the search page and the reader's search highlighting.

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Matches the start of a word for any of the (lowercase) matched index terms. */
export function termPattern(terms: readonly string[]): RegExp | null {
  const parts = terms.filter(Boolean).map(escape);
  return parts.length ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${parts.join("|")})`, "giu") : null;
}
