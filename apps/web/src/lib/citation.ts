// "Copy with source" (task 031 D5): a quote followed by a line saying where it
// comes from, so it can be traced after it is pasted anywhere. A quote from the
// Plain English always says it is our version, never Marx's wording.

import type { MarkLayer } from "./annotations";

export type CitationMeta = {
  /** e.g. "Marx & Engels" */
  authors: string;
  work: string;
  year: number;
  translator?: string;
  translationYear?: number;
  /** e.g. "Chapter I" */
  chapter: string;
};

export function sourceLine(meta: CitationMeta, layer: MarkLayer, url: string): string {
  const base = `${meta.authors}, ${meta.work} (${meta.year}), ${meta.chapter}`;
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
): string {
  return `“${text.trim()}”\n${sourceLine(meta, layer, url)}`;
}
