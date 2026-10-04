// "Copy with source" (task 031 D5): a quote followed by a line saying where it
// comes from, so it can be traced after it is pasted anywhere. A quote from the
// Plain English always says it is our version, never Marx's wording.

import type { MarkLayer } from "./annotations";
import { formatRange } from "./reference";

export type CitationMeta = {
  /** e.g. "Marx & Engels" */
  authors: string;
  work: string;
  year: number;
  translator?: string;
  translationYear?: number;
  /** The chapter's number, e.g. "I": with the passage numbers it makes "I.17" (task 032). */
  numeral: string;
};

/** The source line for a quote from these passages (row ids such as "p00017"). */
export function sourceLine(
  meta: CitationMeta,
  layer: MarkLayer,
  url: string,
  passages: readonly string[],
): string {
  const base = `${meta.authors}, ${meta.work} (${meta.year}), ${formatRange(meta.numeral, passages)}`;
  if (layer === "plain")
    return `— Plain English version by Plain Language Marxist, not the original wording. Based on ${base}. ${url}`.trimEnd();
  const trans = meta.translator
    ? `, trans. ${meta.translator}${meta.translationYear ? ` (${meta.translationYear})` : ""}`
    : "";
  return `— ${base}${trans}. Original text. ${url}`.trimEnd();
}

export function withSource(
  text: string,
  meta: CitationMeta,
  layer: MarkLayer,
  url: string,
  passages: readonly string[],
): string {
  return `“${text.trim()}”\n${sourceLine(meta, layer, url, passages)}`;
}
