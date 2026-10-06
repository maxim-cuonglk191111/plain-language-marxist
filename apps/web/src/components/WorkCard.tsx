import type { DataIndex } from "@plm/schema";
import { authorName, chapters, groupByParts, minutes, workPath } from "../lib/reading";

type Work = DataIndex["works"][number];

export function WorkCard({
  work,
  renderingKey = "en-plain",
}: {
  work: Work;
  renderingKey?: string | undefined;
}) {
  const chapterList = chapters(work, renderingKey);
  const frontMatter = chapterList.filter((c) => c.isFrontMatter);
  const bodyChapters = chapterList.filter((c) => !c.isFrontMatter);
  const hasParts = bodyChapters.some((c) => Boolean(c.part));
  const parts = groupByParts(bodyChapters);

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

  // Prefer first translated body chapter, or first body chapter, or first doc
  const firstDoc =
    bodyChapters.find(
      (c) => (work.documents.find((d) => d.path === c.path)?.covered[renderingKey] ?? 0) > 0,
    ) ??
    bodyChapters[0] ??
    chapterList[0];
  const firstChapterPath = firstDoc?.path ?? workPath(work);
  const isSinglePart = totalDocs <= 1;

  const chaptersCount = bodyChapters.length || totalDocs;
  const prefacesCount = frontMatter.length;
  const metaChaptersLabel = isSinglePart
    ? "Single essay / preface"
    : prefacesCount > 0
      ? `${chaptersCount} chapters · ${prefacesCount} ${prefacesCount === 1 ? "preface" : "prefaces"}`
      : `${chaptersCount} chapters`;

  const previewSummaryLabel = isSinglePart
    ? "Preview part ▾"
    : prefacesCount > 0
      ? `Preview ${chaptersCount} chapters & prefaces ▾`
      : `Preview ${chaptersCount} chapters ▾`;

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
        <span className="work-card-meta-item">{metaChaptersLabel}</span>
        <span aria-hidden="true">·</span>
        <span className="work-card-meta-item">about {totalMinutes} min read</span>
      </div>

      <div className="work-card-actions">
        <a className="work-card-read-btn" href={firstChapterPath}>
          {isSinglePart ? "Read text →" : "Read work →"}
        </a>
      </div>

      <details className="work-chapters-preview">
        <summary className="work-chapters-summary">{previewSummaryLabel}</summary>
        {frontMatter.length > 0 && (
          <div className="work-preview-group">
            <h4 className="work-preview-group-title">Prefaces &amp; Front Matter</h4>
            <ol className="work-chapters-list">
              {frontMatter.map((c) => (
                <li key={c.path}>
                  <a href={c.path}>{c.name.name}</a>
                  <span className="muted">about {minutes(c.words)} min</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {hasParts ? (
          parts.map((part) => (
            <div key={part.title} className="work-preview-group">
              <h4 className="work-preview-group-title">{part.title}</h4>
              <ol className="work-chapters-list">
                {part.chapters.map((c) => (
                  <li key={c.path}>
                    <a href={c.path}>{c.name.name}</a>
                    <span className="muted">about {minutes(c.words)} min</span>
                  </li>
                ))}
              </ol>
            </div>
          ))
        ) : (
          <ol className="work-chapters-list">
            {(bodyChapters.length > 0 ? bodyChapters : chapterList).map((c) => (
              <li key={c.path}>
                <a href={c.path}>{c.name.name}</a>
                <span className="muted">about {minutes(c.words)} min</span>
              </li>
            ))}
          </ol>
        )}
      </details>
    </article>
  );
}
