// Bookmarks, highlights and notes (task 031 D), kept in this browser only.
//
// A persisted shape: plm:annotations = { v: 1, items: Annotation[] }. The
// pre-031 bookmark list (plm:bookmarks = [{ path, title, passage, snippet }])
// is folded in on read, with stable ids so it is never added twice, and the
// old key is removed on the next write. Export/import uses the same shape.

import type { Quote } from "./anchor";
import { BOOKMARKS_KEY, readJson, writeJson } from "./prefs";

export const ANNOTATIONS_KEY = "plm:annotations";
export const COLORS = ["yellow", "green", "blue", "pink"] as const;
export type Color = (typeof COLORS)[number];
export type MarkLayer = "plain" | "original";

export type Annotation = {
  id: string;
  /** A bookmark, or a mark: a highlight (with a colour), a note, or both. */
  kind: "bookmark" | "mark";
  /** "passage" marks cover the whole passage; "text" marks hold a quote in one layer. */
  scope: "passage" | "text";
  path: string;
  /** Chapter name and work title, for lists outside the reader. */
  title: string;
  work: string;
  /** The passage (row) id, e.g. p00017. */
  passage: string;
  layer?: MarkLayer;
  quote?: Quote;
  color?: Color;
  note?: string;
  /** What the reader saw, for lists: the quoted words or the passage's opening. */
  snippet: string;
  created: number;
  updated: number;
  /** Set by the reader when a text mark's words can no longer be found. */
  orphaned?: boolean;
};

export type AnnotationStore = { v: 1; items: Annotation[] };

const str = (v: unknown): v is string => typeof v === "string";
const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

function readQuote(v: unknown): Quote | undefined {
  if (!v || typeof v !== "object") return undefined;
  const q = v as Record<string, unknown>;
  if (!str(q["exact"]) || !q["exact"]) return undefined;
  return {
    exact: q["exact"],
    prefix: str(q["prefix"]) ? q["prefix"] : "",
    suffix: str(q["suffix"]) ? q["suffix"] : "",
    start: num(q["start"]),
  };
}

/** One stored item → a valid Annotation, or null if it is beyond repair. */
function readItem(v: unknown): Annotation | null {
  if (!v || typeof v !== "object") return null;
  const a = v as Record<string, unknown>;
  if (!str(a["id"]) || !str(a["path"]) || !str(a["passage"])) return null;
  const kind = a["kind"] === "bookmark" ? "bookmark" : "mark";
  const quote = readQuote(a["quote"]);
  const scope = a["scope"] === "text" && quote ? "text" : "passage";
  const item: Annotation = {
    id: a["id"],
    kind,
    scope,
    path: a["path"],
    title: str(a["title"]) ? a["title"] : a["path"],
    work: str(a["work"]) ? a["work"] : "",
    passage: a["passage"],
    snippet: str(a["snippet"]) ? a["snippet"] : "",
    created: num(a["created"]),
    updated: num(a["updated"]),
  };
  if (scope === "text" && quote) {
    item.quote = quote;
    item.layer = a["layer"] === "original" ? "original" : "plain";
  }
  if (COLORS.includes(a["color"] as Color)) item.color = a["color"] as Color;
  if (str(a["note"]) && a["note"].trim()) item.note = a["note"];
  if (a["orphaned"] === true) item.orphaned = true;
  // A mark with neither colour nor note carries nothing.
  if (kind === "mark" && !item.color && !item.note) return null;
  return item;
}

export const bookmarkId = (path: string, passage: string) => `bookmark:${path}#${passage}`;

/** Any stored value (and the pre-031 bookmark list) → the current shape. Never throws. */
export function migrateAnnotations(raw: unknown, legacyBookmarks: unknown = []): AnnotationStore {
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { items?: unknown }).items)
      ? (raw as { items: unknown[] }).items
      : [];
  const items = list.flatMap((v) => readItem(v) ?? []);
  const ids = new Set(items.map((a) => a.id));
  for (const b of Array.isArray(legacyBookmarks) ? legacyBookmarks : []) {
    if (!b || typeof b !== "object") continue;
    const { path, passage, title, snippet } = b as Record<string, unknown>;
    if (!str(path) || !str(passage)) continue;
    const id = bookmarkId(path, passage);
    if (ids.has(id)) continue;
    ids.add(id);
    items.push({
      id,
      kind: "bookmark",
      scope: "passage",
      path,
      passage,
      title: str(title) ? title : path,
      work: "",
      snippet: str(snippet) ? snippet : "",
      created: 0,
      updated: 0,
    });
  }
  return { v: 1, items };
}

/** Import: items merge by id, and the more recently updated copy wins. */
export function mergeAnnotations(current: AnnotationStore, incoming: AnnotationStore) {
  const byId = new Map(current.items.map((a) => [a.id, a]));
  let added = 0;
  let updated = 0;
  for (const a of incoming.items) {
    const mine = byId.get(a.id);
    if (!mine) added++;
    else if (a.updated > mine.updated) updated++;
    else continue;
    byId.set(a.id, a);
  }
  return { store: { v: 1 as const, items: [...byId.values()] }, added, updated };
}

export function readAnnotations(): AnnotationStore {
  return migrateAnnotations(
    readJson<unknown>(ANNOTATIONS_KEY, null),
    readJson<unknown>(BOOKMARKS_KEY, []),
  );
}

export function saveAnnotations(store: AnnotationStore): void {
  writeJson(ANNOTATIONS_KEY, store);
  // The bookmarks now live in plm:annotations.
  try {
    if (localStorage.getItem(ANNOTATIONS_KEY)) localStorage.removeItem(BOOKMARKS_KEY);
  } catch {
    // Storage unavailable.
  }
}

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Readable export: grouped by work and chapter, each item with its link. */
export function toMarkdown(items: readonly Annotation[], origin: string): string {
  const lines = ["# Notes from Plain Language Marxist", ""];
  const byWork = new Map<string, Map<string, Annotation[]>>();
  for (const a of [...items].sort((x, y) =>
    (x.path + x.passage).localeCompare(y.path + y.passage),
  )) {
    const work = byWork.get(a.work || "Other") ?? new Map<string, Annotation[]>();
    work.set(a.title, [...(work.get(a.title) ?? []), a]);
    byWork.set(a.work || "Other", work);
  }
  for (const [work, chapters] of byWork) {
    lines.push(`## ${work}`, "");
    for (const [chapter, list] of chapters) {
      lines.push(`### ${chapter}`, "");
      for (const a of list) {
        const what =
          a.kind === "bookmark"
            ? "Bookmark"
            : [a.color ? `Highlight (${a.color})` : "", a.note ? "Note" : ""]
                .filter(Boolean)
                .join(", ");
        const layer =
          a.layer === "plain" ? "Plain English" : a.layer === "original" ? "Original" : "";
        lines.push(`- **${what}**${layer ? ` · ${layer}` : ""} · ${origin}${a.path}#${a.passage}`);
        const words = a.quote?.exact ?? a.snippet;
        if (words) lines.push(`  > ${words.replace(/\s+/g, " ")}`);
        if (a.layer === "plain")
          lines.push(
            "  > — Plain English version by Plain Language Marxist, not the original wording.",
          );
        if (a.orphaned) lines.push("  _Text changed — this highlight could not be placed._");
        if (a.note) lines.push(`  ${a.note.replace(/\n/g, "\n  ")}`);
        lines.push("");
      }
    }
  }
  return lines.join("\n");
}
