// Reading paths, local progress (task 032 C). A chapter on a path counts as
// done when the reading history (plm:reading) says it is finished, unless the
// reader ticked or unticked it by hand on that path. Kept in this browser only.
//
// A persisted shape: plm:paths = { v: 1, paths: { [pathId]: { [chapterPath]: boolean } } }.
// Only hand-set marks that differ from the reading history are stored, so a
// chapter the reader leaves alone keeps following the history.

import type { History } from "./history";
import { readJson, writeJson } from "./prefs";

export const PATHS_KEY = "plm:paths";

/** One chapter on a path, with its reading time (task 031 A). */
export type PathChapter = { path: string; title: string; minutes: number };

/** One item of a reading path: a whole work (several chapters) or one chapter. */
export type PathStep = {
  kind: "work" | "chapter";
  title: string;
  href: string;
  /** The work's title, shown beside a chapter step. */
  work: string;
  chapters: PathChapter[];
};

export type PathTicks = { v: 1; paths: Record<string, Record<string, boolean>> };

/** Normalises whatever is stored (any version, partial data, garbage) into the current shape. Never throws. */
export function normalizePathTicks(raw: unknown): PathTicks {
  const paths: PathTicks["paths"] = {};
  const stored =
    raw && typeof raw === "object" && "paths" in raw && raw.paths && typeof raw.paths === "object"
      ? (raw.paths as Record<string, unknown>)
      : {};
  for (const [id, marks] of Object.entries(stored)) {
    if (!marks || typeof marks !== "object" || Array.isArray(marks)) continue;
    const kept: Record<string, boolean> = {};
    for (const [chapter, value] of Object.entries(marks as Record<string, unknown>)) {
      if (typeof value === "boolean") kept[chapter] = value;
    }
    if (Object.keys(kept).length > 0) paths[id] = kept;
  }
  return { v: 1, paths };
}

export const readPathTicks = (): PathTicks =>
  normalizePathTicks(readJson<unknown>(PATHS_KEY, null));
export const savePathTicks = (ticks: PathTicks): void => writeJson(PATHS_KEY, ticks);

const finishedIn = (history: History, chapter: string) => history.docs[chapter]?.finished === true;

/** Whether a chapter on a path is done: the reader's own mark, else the reading history. */
export function isDone(
  ticks: PathTicks,
  history: History,
  pathId: string,
  chapter: string,
): boolean {
  return ticks.paths[pathId]?.[chapter] ?? finishedIn(history, chapter);
}

/**
 * Returns new ticks with a chapter marked done or not done by hand. A mark
 * that agrees with the reading history is dropped rather than stored.
 */
export function setTick(
  ticks: PathTicks,
  history: History,
  pathId: string,
  chapter: string,
  done: boolean,
): PathTicks {
  const others = Object.entries(ticks.paths[pathId] ?? {}).filter(([c]) => c !== chapter);
  const marks = Object.fromEntries(
    done === finishedIn(history, chapter) ? others : [...others, [chapter, done]],
  );
  const paths = Object.fromEntries(Object.entries(ticks.paths).filter(([id]) => id !== pathId));
  return { v: 1, paths: Object.keys(marks).length > 0 ? { ...paths, [pathId]: marks } : paths };
}

/** The first chapter not yet done, in path order; null when every step is done. */
export function nextChapter(
  steps: readonly PathStep[],
  done: (chapter: string) => boolean,
): PathChapter | null {
  for (const step of steps) for (const c of step.chapters) if (!done(c.path)) return c;
  return null;
}

/** Chapters done and in total, counting a chapter that appears twice only once. */
export function pathCounts(
  steps: readonly PathStep[],
  done: (chapter: string) => boolean,
): { done: number; total: number } {
  const all = new Set(steps.flatMap((s) => s.chapters.map((c) => c.path)));
  return { done: [...all].filter(done).length, total: all.size };
}
