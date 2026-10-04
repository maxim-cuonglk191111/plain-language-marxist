// "Where this term appears" (task 032 B), like a concordance in a study Bible:
// every place a vocabulary term is marked, in the Original and in the Plain
// English. Built at build time from the documents, with the same matching the
// reader uses to draw term marks (lib/termmarks.ts), so the counts agree.
import { collectNodes, parseLayout, type DataTerm, type TermFile } from "@plm/schema";
import { formFor, parseTokens, resolveChoice, type ResolveContext } from "@plm/terms";
import { getDocument, getIndex, getTerm, type DocumentEntry } from "./data";
import { chapters, workShort } from "./reading";
import { formatRef } from "./reference";
import { annotationRanges, capitalizeFirst, findKept, keptSurfaces, type Range } from "./termmarks";
import { toTermFile } from "./terms";

/** Joined text nodes of layout markup: the text the reader's term marks are counted in. */
function textOf(layout: string): string {
  const parsed = parseLayout(layout);
  return parsed.ok
    ? collectNodes(parsed.nodes, "text")
        .map((n) => n.value)
        .join("")
    : layout;
}

/** Original: the annotated occurrences, as LayoutText marks them. */
export function originalMarks(
  layout: string,
  annotations: readonly { term: string; match: string; occurrence: number }[],
): { text: string; ranges: Range[] } {
  const text = textOf(layout);
  return { text, ranges: annotationRanges(text, annotations) };
}

const OPEN = "";
const CLOSE = "";

/**
 * Plain English: {term} tokens (shown in the project's default wording) plus
 * words of kept terms. Each token is wrapped in private-use markers before the
 * layout markup is removed, so its position survives; then the markers go.
 */
export function plainMarks(
  textRaw: string,
  vocabulary: ReadonlyMap<string, TermFile>,
  context: ResolveContext,
): { text: string; ranges: Range[] } {
  const parsed = parseTokens(textRaw);
  if (!parsed.ok) return { text: textOf(textRaw), ranges: [] };
  const terms: string[] = [];
  const marked = parsed.segments
    .map((s) => {
      if (s.kind === "text") return s.value;
      const file = vocabulary.get(s.term);
      const word = file ? formFor(file, resolveChoice(file, context, s.pin), s.form) : undefined;
      const shown = word === undefined ? s.raw : s.capitalize ? capitalizeFirst(word) : word;
      if (!file) return shown;
      terms.push(s.term);
      return `${OPEN}${shown}${CLOSE}`;
    })
    .join("");
  const withMarkers = textOf(marked);
  let text = "";
  const ranges: Range[] = [];
  let open = -1;
  for (const ch of withMarkers) {
    if (ch === OPEN) open = text.length;
    else if (ch === CLOSE) {
      ranges.push({ start: open, end: text.length, term: terms[ranges.length] ?? "" });
    } else text += ch;
  }
  // Kept words outside the tokens, as LayoutText marks them in the text between tokens.
  for (const r of findKept(text, keptSurfaces(vocabulary)))
    if (!ranges.some((t) => r.start < t.end && r.end > t.start)) ranges.push(r);
  return { text, ranges: ranges.sort((a, b) => a.start - b.start) };
}

/** About `size` characters each side of the match, cut at words. */
export function around(text: string, start: number, end: number, size = 70) {
  let from = Math.max(0, start - size);
  if (from > 0) from = text.indexOf(" ", from) + 1 || from;
  let to = Math.min(text.length, end + size);
  if (to < text.length) to = text.lastIndexOf(" ", to) > end ? text.lastIndexOf(" ", to) : to;
  return {
    before: `${from > 0 ? "…" : ""}${text.slice(from, start).trimStart()}`,
    match: text.slice(start, end),
    after: `${text.slice(end, to).trimEnd()}${to < text.length ? "…" : ""}`,
  };
}

export type Occurrence = {
  path: string;
  passage: string;
  layer: "original" | "plain";
  ref: string;
  work: string;
  chapter: string;
  before: string;
  match: string;
  after: string;
};

let cache: Map<string, Occurrence[]> | undefined;

/** Every term's occurrences in every published chapter, in reading order. */
export function concordance(renderingKey: string): Map<string, Occurrence[]> {
  if (cache) return cache;
  const vocabulary = new Map<string, TermFile>(
    getIndex().terms.map((t) => {
      const term: DataTerm = getTerm(t.term);
      return [term.term, toTermFile(term)];
    }),
  );
  const found = new Map<string, Occurrence[]>();
  const add = (term: string, o: Occurrence) => found.set(term, [...(found.get(term) ?? []), o]);
  for (const work of getIndex().works) {
    const context: ResolveContext = { workId: work.id, authors: work.authors };
    const list = chapters(work, renderingKey);
    work.documents.forEach((d, i) => {
      const chapter = list[i];
      if (!chapter) return;
      const doc = getDocument({ ...d, work } as DocumentEntry);
      const prefix = `${workShort(work)} ${chapter.numeral}`;
      const base = { path: d.path, work: work.title, chapter: chapter.name.name };
      for (const p of doc.passages) {
        const { text, ranges } = originalMarks(p.text, p.annotations);
        for (const r of ranges)
          add(r.term, {
            ...base,
            passage: p.id,
            layer: "original",
            ref: formatRef(prefix, p.id),
            ...around(text, r.start, r.end),
          });
      }
      for (const r of doc.renderings[renderingKey] ?? []) {
        const first = r.covers[0] ?? "";
        const { text, ranges } = plainMarks(r.text_raw, vocabulary, context);
        for (const m of ranges)
          add(m.term, {
            ...base,
            passage: first,
            layer: "plain",
            ref: formatRef(prefix, first),
            ...around(text, m.start, m.end),
          });
      }
    });
  }
  // Reading order: by chapter, then passage, the Original before the Plain English.
  for (const list of found.values())
    list.sort(
      (a, b) =>
        a.path.localeCompare(b.path) ||
        a.passage.localeCompare(b.passage) ||
        (a.layer === b.layer ? 0 : a.layer === "original" ? -1 : 1),
    );
  cache = found;
  return found;
}
