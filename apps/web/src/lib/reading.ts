// Build-time facts about a work and its chapters (task 031, Part A): chapter
// names, section headings, word counts and the work's own page. All computed
// from the data contract already loaded for the page, so /data/v1 does not change.
import { parseLayout, toPlainText, type DataDocument, type DataIndex } from "@plm/schema";
import { getDocument, getIndex, type DocumentEntry } from "./data";
import type { RefWork } from "./reference";
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

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

function parseWordNumber(s: string): number | null {
  const parts = s.toLowerCase().split(/[\s-]+/);
  let sum = 0;
  for (const p of parts) {
    const val = WORD_NUMBERS[p];
    if (val === undefined) return null;
    sum += val;
  }
  return sum > 0 ? sum : null;
}

export function isFrontMatterDoc(doc: DataDocument): boolean {
  if (doc.id.includes(":pref-") || doc.id.endsWith(":preface") || doc.id.endsWith(":afterword")) {
    return true;
  }
  const t = doc.title.toLowerCase();
  if (t.includes("preface") || t.includes("afterword")) {
    return true;
  }
  return doc.passages.some(
    (p) =>
      p.type === "heading" &&
      /^(?:(?:\d{4}\s+)?(?:preface|afterword|introduction)\b)/i.test(plainOf(p.text)),
  );
}

export type ChapterName = { name: string; short: string };

/**
 * A chapter's display name, from its "Chapter II. …" or "Chapter One: …" heading when it has one
 * (document titles like "Communist Manifesto (Chapter 2)" are source page titles).
 */
export function chapterName(doc: DataDocument, ordinal: number): ChapterName {
  if (doc.id.includes("communist-manifesto") && doc.id.endsWith("preface")) {
    return {
      name: "Prefaces to Various Editions (1872–1893)",
      short: "Prefaces",
    };
  }
  const headings = doc.passages.filter((p) => p.type === "heading").map((p) => plainOf(p.text));

  const isPref = isFrontMatterDoc(doc);
  if (isPref) {
    const prefHeading = headings.find((h) =>
      /^(?:(?:\d{4}\s+)?(?:preface|afterword|introduction)\b)/i.test(h),
    );
    if (prefHeading) {
      const yearMatch = /\b(1\d{3})\b/.exec(prefHeading);
      const isAfterword = /afterword/i.test(prefHeading);
      const kind = isAfterword ? "Afterword" : "Preface";
      const short = yearMatch ? `${kind} (${yearMatch[1]})` : kind;
      return { name: prefHeading, short };
    }
    const cleanedTitle = doc.title.replace(
      /^Economic Manuscripts:\s*Capital\s*Vol\.\s*I\s*-\s*/i,
      "",
    );
    return { name: cleanedTitle, short: "Preface" };
  }

  for (const h of headings) {
    const m = /^Chapter\s+([IVXLC]+|\d+)\b\.?\s*(.*)$/i.exec(h);
    if (m) return { name: h, short: `Ch. ${m[1]}` };

    const mw = /^Chapter\s+([a-z]+(?:[\s-][a-z]+)?)\b[:.]?\s*(.*)$/i.exec(h);
    if (mw) {
      const num = parseWordNumber(mw[1] ?? "");
      if (num !== null) return { name: h, short: `Ch. ${num}` };
    }
  }
  return {
    name: sectionsName(headings) ?? doc.title,
    short: isPref ? "Preface" : `Ch. ${ordinal}`,
  };
}

/**
 * A document without a "Chapter II." heading but with numbered sections ("VI. Value and
 * Labour", … "XI. …") is named by them: "VI–XI. Value and Labour …", after any unnumbered
 * opening heading ("Preliminary; I–V. Production and Wages …"). Source page titles are
 * often the whole work's title, the same on every page, so they come last.
 */
function sectionsName(headings: readonly string[]): string | null {
  const numbered = headings.flatMap((h) => {
    const m = /^([IVXLC]+|\d+)\.\s+(.+)$/.exec(h);
    return m ? [{ num: m[1] ?? "", title: m[2] ?? "" }] : [];
  });
  const first = numbered[0];
  const last = numbered.at(-1);
  if (!first || !last) return null;
  const range = first === last ? first.num : `${first.num}–${last.num}`;
  const lead = headings[0] && !/^([IVXLC]+|\d+)\.\s/.test(headings[0]) ? `${headings[0]}; ` : "";
  return `${lead}${range}. ${first.title}${numbered.length > 1 ? " …" : ""}`;
}

export type Section = { id: string; title: string; level: number };

/** Heading passages inside a chapter, apart from the chapter's own title. */
export function sections(doc: DataDocument, chapter: ChapterName): Section[] {
  return doc.passages
    .filter((p) => {
      if (p.type !== "heading") return false;
      const text = plainOf(p.text);
      if (text === chapter.name) return false;
      if (/^(?:preface|afterword)$/i.test(text.trim())) return false;
      if (/^Part\s+([IVXLC]+|\d+)\b[:.]?\s*/i.test(text.trim())) return false;
      return true;
    })
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
  /** The chapter's number as its heading writes it: "II" (task 032 references). */
  numeral: string;
  passages: number;
  words: number;
  sections: Section[];
  opening: string;
  isFrontMatter?: boolean | undefined;
  part?: string | undefined;
};

export type PartGroup = {
  title: string;
  chapters: ChapterInfo[];
};

export function groupByParts(chapterList: readonly ChapterInfo[]): PartGroup[] {
  const groups: PartGroup[] = [];
  let currentGroup: PartGroup | null = null;
  for (const c of chapterList) {
    const title = c.part ?? "";
    if (!currentGroup || currentGroup.title !== title) {
      currentGroup = { title, chapters: [] };
      groups.push(currentGroup);
    }
    currentGroup.chapters.push(c);
  }
  return groups;
}

const chapterCache = new Map<string, ChapterInfo[]>();

/** Every chapter of a work, in order, with what navigation needs. Loads each document once. */
export function chapters(work: Work, renderingKey: string): ChapterInfo[] {
  const key = `${work.id}|${renderingKey}`;
  const cached = chapterCache.get(key);
  if (cached) return cached;
  let bodyCount = 0;
  let currentPart: string | undefined = undefined;
  const list = work.documents.map((d) => {
    const doc = getDocument({ ...d, work } as DocumentEntry);
    const isFront = isFrontMatterDoc(doc);
    if (!isFront) {
      bodyCount += 1;
      const partHeading = doc.passages.find(
        (p) => p.type === "heading" && /^Part\s+([IVXLC]+|\d+)\b[:.]?\s*/i.test(plainOf(p.text)),
      );
      if (partHeading) {
        currentPart = plainOf(partHeading.text);
      }
    }
    const name = chapterName(doc, isFront ? 0 : bodyCount);
    return {
      path: d.path,
      name,
      numeral: name.short.replace(/^Ch. /, ""),
      passages: d.passages,
      words: chapterWords(doc, renderingKey),
      sections: sections(doc, name),
      opening: openingLine(doc, renderingKey),
      isFrontMatter: isFront,
      part: isFront ? undefined : currentPart,
    };
  });
  chapterCache.set(key, list);
  return list;
}

export const authorName = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);

/** The name in passage references: the work's short title, or its title. */
export const workShort = (work: Work) => work.short_title ?? work.title;

/** What the reference parser needs to know about a work (task 032 A). */
export function refWork(work: Work, renderingKey: string): RefWork {
  return {
    short: workShort(work),
    title: work.title,
    chapters: chapters(work, renderingKey).map((c) => ({
      path: c.path,
      numeral: c.numeral,
      passages: c.passages,
    })),
  };
}

/** Every chapter's reference prefix ("Manifesto II"), by path, for lists outside the reader. */
export function refPrefixes(renderingKey: string): Record<string, string> {
  return Object.fromEntries(
    getIndex().works.flatMap((w) =>
      chapters(w, renderingKey).map((c) => [c.path, `${workShort(w)} ${c.numeral}`]),
    ),
  );
}
