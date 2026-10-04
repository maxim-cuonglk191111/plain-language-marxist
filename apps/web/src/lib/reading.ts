// Build-time facts about a work and its chapters (task 031, Part A): chapter
// names, section headings, word counts and the work's own page. All computed
// from the data contract already loaded for the page, so /data/v1 does not change.
import { parseLayout, toPlainText, type DataDocument, type DataIndex } from "@plm/schema";
import { getDocument, type DocumentEntry } from "./data";
import type { Row } from "./rows";

type Work = DataIndex["works"][number];
type Passage = DataDocument["passages"][number];

/** Layout markup → plain text. Falls back to stripping tags if the markup does not parse. */
export function plainOf(layout: string): string {
  const parsed = parseLayout(layout);
  if (parsed.ok) return toPlainText(parsed.nodes);
  return layout
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

/** The work's own page: the folder its chapters live in, e.g. /archive/…/communist-manifesto/. */
export function workPath(work: Work): string {
  const first = work.documents[0]?.path ?? `/archive/${work.id}`;
  return first.slice(0, first.lastIndexOf("/") + 1);
}

export type ChapterName = { name: string; short: string };

/**
 * A chapter's display name, from its "Chapter II. …" heading when it has one
 * (document titles like "Communist Manifesto (Chapter 2)" are source page titles).
 */
export function chapterName(doc: DataDocument, ordinal: number): ChapterName {
  for (const p of doc.passages) {
    if (p.type !== "heading") continue;
    const m = /^Chapter\s+([IVXLC]+|\d+)\b\.?\s*(.*)$/i.exec(plainOf(p.text));
    if (m) return { name: plainOf(p.text), short: `Ch. ${m[1]}` };
  }
  return { name: doc.title, short: `Ch. ${ordinal}` };
}

export type Section = { id: string; title: string; level: number };

/** Heading passages inside a chapter, apart from the chapter's own title. */
export function sections(doc: DataDocument, chapter: ChapterName): Section[] {
  return doc.passages
    .filter((p) => p.type === "heading" && plainOf(p.text) !== chapter.name)
    .map((p) => ({ id: p.id, title: plainOf(p.text), level: p.level ?? 2 }));
}

/** Words per layer in one row: Plain English, Original, Context. */
export type RowWords = [plain: number, original: number, context: number];

export function rowWords(row: Row, contextTexts: readonly string[]): RowWords {
  return [
    row.rendering ? countWords(plainOf(row.rendering.text)) : 0,
    row.originals.reduce((n, p) => n + countWords(plainOf(p.text)), 0),
    contextTexts.reduce((n, t) => n + countWords(plainOf(t)), 0),
  ];
}

/** Words a reader of the default layer (Plain English, the Original where it is missing) reads. */
export function chapterWords(doc: DataDocument, renderingKey: string): number {
  const renderings = doc.renderings[renderingKey] ?? [];
  const covered = new Set(renderings.flatMap((r) => r.covers));
  return (
    renderings.reduce((n, r) => n + countWords(plainOf(r.text)), 0) +
    doc.passages
      .filter((p) => !covered.has(p.id))
      .reduce((n, p) => n + countWords(plainOf(p.text)), 0)
  );
}

export const DEFAULT_WPM = 200;

export function minutes(words: number, wpm = DEFAULT_WPM): number {
  return Math.max(1, Math.round(words / wpm));
}

/** The first passage of running text: what the end-of-chapter card quotes from the next chapter. */
export function openingLine(doc: DataDocument, renderingKey: string, max = 180): string {
  const passage: Passage | undefined = doc.passages.find(
    (p) => p.type !== "heading" && p.type !== "separator",
  );
  if (!passage) return "";
  const rendering = (doc.renderings[renderingKey] ?? []).find((r) => r.covers[0] === passage.id);
  const text = plainOf(rendering?.text ?? passage.text);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" "))} …`;
}

export type ChapterInfo = {
  path: string;
  name: ChapterName;
  words: number;
  sections: Section[];
  opening: string;
};

const chapterCache = new Map<string, ChapterInfo[]>();

/** Every chapter of a work, in order, with what navigation needs. Loads each document once. */
export function chapters(work: Work, renderingKey: string): ChapterInfo[] {
  const key = `${work.id}|${renderingKey}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;
  const list = work.documents.map((d, i) => {
    const doc = getDocument({ ...d, work } as DocumentEntry);
    const name = chapterName(doc, i + 1);
    return {
      path: d.path,
      name,
      words: chapterWords(doc, renderingKey),
      sections: sections(doc, name),
      opening: openingLine(doc, renderingKey),
    };
  });
  chapterCache.set(key, list);
  return list;
}

export const authorName = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);
