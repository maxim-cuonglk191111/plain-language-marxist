// Reading history (task 031, Part A): where the reader is in each chapter, how
// far through, and which chapters are finished. Kept in this browser only.
//
// A persisted shape: plm:reading = { v: 1, docs: { [path]: Entry } }. Before
// task 031 only the passage was stored, as plm:progress:<path> = "p00017";
// those keys are still read (migrated into the new shape on the next write).

import { readJson, writeJson } from "./prefs";

export const HISTORY_KEY = "plm:reading";
const LEGACY_PREFIX = "plm:progress:";

export type HistoryEntry = {
  /** Chapter display name, e.g. "Chapter II. Proletarians and Communists". */
  title: string;
  work: string;
  workPath: string;
  /** Topmost passage on screen when last read. */
  passage: string;
  /** 0–100, by words of the layers shown at the time. */
  percent: number;
  /** ms since epoch; 0 for entries migrated from the old keys. */
  updated: number;
  finished: boolean;
};

export type History = { v: 1; docs: Record<string, HistoryEntry> };

const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);

/**
 * Normalises whatever is stored (any version, partial entries, garbage) into
 * the current shape, adding legacy plm:progress:<path> passages that the new
 * shape does not have yet. Never throws.
 */
export function migrateHistory(raw: unknown, legacy: Record<string, string> = {}): History {
  const docs: Record<string, HistoryEntry> = {};
  const stored =
    raw && typeof raw === "object" && "docs" in raw && raw.docs && typeof raw.docs === "object"
      ? (raw.docs as Record<string, unknown>)
      : {};
  for (const [path, value] of Object.entries(stored)) {
    if (!value || typeof value !== "object") continue;
    const e = value as Record<string, unknown>;
    docs[path] = {
      title: str(e["title"], path),
      work: str(e["work"], ""),
      workPath: str(e["workPath"], path.slice(0, path.lastIndexOf("/") + 1)),
      passage: str(e["passage"], ""),
      percent: Math.min(100, Math.max(0, num(e["percent"], 0))),
      updated: num(e["updated"], 0),
      finished: e["finished"] === true,
    };
  }
  for (const [path, passage] of Object.entries(legacy)) {
    docs[path] ??= {
      title: path.split("/").pop() ?? path,
      work: "",
      workPath: path.slice(0, path.lastIndexOf("/") + 1),
      passage,
      percent: 0,
      updated: 0,
      finished: false,
    };
  }
  return { v: 1, docs };
}

function legacyProgress(): Record<string, string> {
  const found: Record<string, string> = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(LEGACY_PREFIX)) continue;
      const passage = readJson<unknown>(key, null);
      if (typeof passage === "string") found[key.slice(LEGACY_PREFIX.length)] = passage;
    }
  } catch {
    // Storage unavailable: no legacy entries.
  }
  return found;
}

export function readHistory(): History {
  return migrateHistory(readJson<unknown>(HISTORY_KEY, null), legacyProgress());
}

function save(history: History): void {
  writeJson(HISTORY_KEY, history);
  // Once migrated, the old keys are redundant.
  try {
    for (const path of Object.keys(legacyProgress())) localStorage.removeItem(LEGACY_PREFIX + path);
  } catch {
    // Nothing to clean up.
  }
}

export type ChapterMeta = Pick<HistoryEntry, "title" | "work" | "workPath">;

export function recordPosition(
  path: string,
  meta: ChapterMeta,
  passage: string,
  percent: number,
): void {
  const h = readHistory();
  const prev = h.docs[path];
  h.docs[path] = {
    ...meta,
    passage,
    percent: Math.round(Math.min(100, Math.max(0, percent))),
    updated: Date.now(),
    finished: prev?.finished ?? false,
  };
  save(h);
}

export function setFinished(path: string, meta: ChapterMeta | null, finished: boolean): void {
  const h = readHistory();
  const base = h.docs[path] ?? (meta && { ...meta, passage: "", percent: 0 });
  if (!base) return;
  h.docs[path] = {
    ...base,
    ...meta,
    percent: finished ? 100 : base.percent,
    updated: Date.now(),
    finished,
  };
  save(h);
}

export function removeEntry(path: string): void {
  const h = readHistory();
  save({ v: 1, docs: Object.fromEntries(Object.entries(h.docs).filter(([p]) => p !== path)) });
  try {
    localStorage.removeItem(LEGACY_PREFIX + path);
  } catch {
    // Storage unavailable.
  }
}
