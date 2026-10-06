import type { DataIndex } from "@plm/schema";
import { authorName, chapters, DEFAULT_WPM, minutes, workPath } from "../lib/reading";
import { ChapterStatus, ContinueReading } from "./WorkProgress";

type Work = DataIndex["works"][number];

/**
 * A work's own page (task 031, Part A), at its folder path: who wrote it, the
 * chapters with their reading times, and a way in. Pre-rendered; local
 * progress (read marks, Continue reading) is filled in with JavaScript.
 */
export function WorkPage({ work, renderingKey }: { work: Work; renderingKey: string }) {
  const list = chapters(work, renderingKey);
  const frontMatter = list.filter((c) => c.isFrontMatter);
  const bodyChapters = list.filter((c) => !c.isFrontMatter);
  const first = bodyChapters[0]?.path ?? list[0]?.path ?? workPath(work);
  return (
    <div className="prose-page work-page">
      <p className="work-title">{work.authors.map(authorName).join(" and ")}</p>
      <h1>{work.title}</h1>
      <p className="attribution">
        Written {work.year}
        {work.translation
          ? `. English translation by ${work.translation.translator} (${work.translation.year})`
          : ""}
        . Original text: {work.rights.attribution}; each chapter links to its source page.
      </p>
      <ContinueReading workPath={workPath(work)} firstChapter={first} />
      {frontMatter.length > 0 && (
        <>
          <h2>Prefaces and Afterwords</h2>
          <ol className="chapter-list front-matter-list">
            {frontMatter.map((c) => (
              <li key={c.path}>
                <a href={c.path}>{c.name.name}</a>{" "}
                <span className="muted">about {minutes(c.words)} min</span>{" "}
                <ChapterStatus path={c.path} />
              </li>
            ))}
          </ol>
        </>
      )}
      <h2>Chapters</h2>
      <ol className="chapter-list">
        {bodyChapters.map((c) => (
          <li key={c.path}>
            <a href={c.path}>{c.name.name}</a>{" "}
            <span className="muted">about {minutes(c.words)} min</span>{" "}
            <ChapterStatus path={c.path} />
          </li>
        ))}
      </ol>
      <p className="muted small">
        Reading times are for the Plain English at {DEFAULT_WPM} words a minute. Your progress is
        saved in this browser only.
      </p>
    </div>
  );
}
