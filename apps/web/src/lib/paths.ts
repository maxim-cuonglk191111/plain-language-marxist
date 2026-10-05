// Reading paths at build time (task 032 C, SDD §5.7): the paths in the data
// contract, with each item expanded to its chapters and their reading times.
import type { DataIndex } from "@plm/schema";
import { getIndex } from "./data";
import type { PathStep } from "./pathprogress";
import { chapters, minutes, workPath } from "./reading";

/**
 * The placeholder /paths/<id> page built when there are no paths (a static
 * export cannot have an empty dynamic route). Not a valid slug, so it cannot
 * clash with a real path; apps/web/scripts/finalize-export.mjs removes it.
 */
export const NO_PATHS = "_none";

export type ReadingPath = DataIndex["collections"][number] & { kind: "reading_path" };

export function readingPaths(): ReadingPath[] {
  return getIndex().collections.filter((c): c is ReadingPath => c.kind === "reading_path");
}

/** A path's items as steps: a work becomes all its chapters, a document one chapter. Unknown items are skipped. */
export function pathSteps(path: ReadingPath, renderingKey: string): PathStep[] {
  const works = getIndex().works;
  const steps: PathStep[] = [];
  for (const item of path.items) {
    const work = works.find((w) => w.id === item);
    if (work) {
      steps.push({
        kind: "work",
        title: work.title,
        href: workPath(work),
        work: work.title,
        chapters: chapters(work, renderingKey).map((c) => ({
          path: c.path,
          title: c.name.name,
          minutes: minutes(c.words),
        })),
      });
      continue;
    }
    const owner = works.find((w) => w.documents.some((d) => d.id === item));
    const doc = owner?.documents.find((d) => d.id === item);
    const info = owner && doc && chapters(owner, renderingKey).find((c) => c.path === doc.path);
    if (!owner || !info) continue;
    const chapter = { path: info.path, title: info.name.name, minutes: minutes(info.words) };
    steps.push({
      kind: "chapter",
      title: chapter.title,
      href: chapter.path,
      work: owner.title,
      chapters: [chapter],
    });
  }
  return steps;
}

export const totalMinutes = (steps: readonly PathStep[]) =>
  steps.reduce((n, s) => n + s.chapters.reduce((m, c) => m + c.minutes, 0), 0);
