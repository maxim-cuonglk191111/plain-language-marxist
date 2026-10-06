import type { DataIndex } from "@plm/schema";
import { authorName, chapters, minutes, workPath } from "../lib/reading";

type Work = DataIndex["works"][number];

export function WorkCard({
  work,
  renderingKey = "en-plain",
}: {
  work: Work;
  renderingKey?: string | undefined;
}) {
  const chapterList = chapters(work, renderingKey);
  const totalWords = chapterList.reduce((sum, c) => sum + c.words, 0);
  const totalMinutes = minutes(totalWords);
  const totalDocs = work.documents.length;
  const totalPassages = work.documents.reduce((sum, d) => sum + d.passages, 0);
  const coveredPassages = work.documents.reduce(
    (sum, d) => sum + (d.covered[renderingKey] ?? 0),
    0,
  );
  const isComplete = totalPassages > 0 && coveredPassages === totalPassages;
  const hasPlain = coveredPassages > 0;
  const firstDoc =
    work.documents.find((d) => (d.covered[renderingKey] ?? 0) > 0) ?? work.documents[0];
  const firstChapterPath = firstDoc?.path ?? workPath(work);
  const isSinglePart = totalDocs <= 1;

  return (
    <article className="work-card" aria-labelledby={`work-${work.id}`}>
      <div className="work-card-header">
        <h3 id={`work-${work.id}`} className="work-card-title">
          <a href={workPath(work)}>{work.title}</a>
        </h3>
        {isComplete ? (
          <span className="badge work-status-badge complete">Complete · Plain English</span>
        ) : hasPlain ? (
          <span className="badge work-status-badge in-progress">
            {coveredPassages} of {totalPassages} passages
          </span>
        ) : (
          <span className="badge work-status-badge original">Original text</span>
        )}
      </div>

      <p className="work-card-byline">
        {work.authors.map(authorName).join(" and ")}, {work.year}
        {work.translation && (
          <span className="work-card-trans">
            {" "}
            · {work.translation.translator} ({work.translation.year})
          </span>
        )}
      </p>

      <div className="work-card-meta">
        <span className="work-card-meta-item">
          {isSinglePart ? "Single essay / preface" : `${totalDocs} chapters`}
        </span>
        <span aria-hidden="true">·</span>
        <span className="work-card-meta-item">about {totalMinutes} min read</span>
      </div>

      <div className="work-card-actions">
        <a className="work-card-read-btn" href={firstChapterPath}>
          Read work →
        </a>
        <a className="work-card-toc-link" href={workPath(work)}>
          Table of contents
        </a>
      </div>

      <details className="work-chapters-preview">
        <summary className="work-chapters-summary">
          Preview {isSinglePart ? "part" : `${totalDocs} chapters`} ▾
        </summary>
        <ol className="work-chapters-list">
          {chapterList.map((c) => (
            <li key={c.path}>
              <a href={c.path}>{c.name.name}</a>
              <span className="muted">about {minutes(c.words)} min</span>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
