import type { DataDocument, TermFile } from "@plm/schema";
import type { ResolveContext } from "@plm/terms";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Annotations } from "../../../components/Annotations";
import { LayoutText, type TermMarking } from "../../../components/LayoutText";
import { LayerSwitch } from "../../../components/LayerSwitch";
import { ReadingAids } from "../../../components/ReadingAids";
import { ReadingProgress } from "../../../components/ReadingProgress";
import { SearchHighlight } from "../../../components/SearchHighlight";
import { TermCards } from "../../../components/TermCards";
import { TocDrawer } from "../../../components/TocDrawer";
import { WorkPage } from "../../../components/WorkPage";
import { allDocuments, findDocument, getDocument, getIndex, getTerm } from "../../../lib/data";
import { LAYERS, LAYER_LABEL } from "../../../lib/layers";
import { authorName, chapters, rowWords, workPath, type ChapterInfo } from "../../../lib/reading";
import { buildRows, footnoteTargets } from "../../../lib/rows";
import { termsUsed, toTermFile } from "../../../lib/terms";

const RENDERING = "en-plain";
type Props = { params: Promise<{ path: string[] }> };
type Passage = DataDocument["passages"][number];
type Explanation = DataDocument["explanations"][number];

export const dynamicParams = false;

const segments = (path: string) =>
  path
    .replace(/^\/archive\//, "")
    .replace(/\/$/, "")
    .split("/");

/** Every chapter, plus each work's own page at its folder path (task 031). */
export function generateStaticParams() {
  return [
    ...allDocuments().map((d) => ({ path: segments(d.path) })),
    ...getIndex().works.map((w) => ({ path: segments(workPath(w)) })),
  ];
}

async function load(props: Props) {
  const { path } = await props.params;
  const url = `/archive/${path.map(decodeURIComponent).join("/")}`;
  const entry = findDocument(url);
  if (entry) return { kind: "document" as const, entry, doc: getDocument(entry) };
  const work = getIndex().works.find((w) => workPath(w) === `${url}/`);
  if (work) return { kind: "work" as const, work };
  notFound();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await load(props);
  if (page.kind === "work")
    return { title: page.work.title, alternates: { canonical: workPath(page.work) } };
  const { entry, doc } = page;
  const name = chapters(entry.work, RENDERING).find((c) => c.path === doc.path)?.name.name;
  return {
    title: `${name ?? doc.title} — ${entry.work.title}`,
    alternates: { canonical: doc.path },
  };
}

export default async function ArchivePage(props: Props) {
  const page = await load(props);
  if (page.kind === "work") return <WorkPage work={page.work} renderingKey={RENDERING} />;
  return <DocumentPage entry={page.entry} doc={page.doc} />;
}

function DocumentPage({
  entry,
  doc,
}: {
  entry: NonNullable<ReturnType<typeof findDocument>>;
  doc: DataDocument;
}) {
  const rows = buildRows(doc, RENDERING);
  const work = chapters(entry.work, RENDERING);
  const at = work.findIndex((c) => c.path === doc.path);
  const chapter = work[at];
  if (!chapter) notFound();
  const prev = work[at - 1];
  const next = work[at + 1];
  const home = workPath(entry.work);
  const meta = { title: chapter.name.name, work: entry.work.title, workPath: home };
  const ordinal = new Map(doc.passages.map((p, i) => [p.id, i + 1]));
  // "Copy with source" (task 031 D5): who wrote it, and which chapter.
  const cite = {
    authors: entry.work.authors.map(authorName).join(" & "),
    work: entry.work.title,
    year: entry.work.year,
    ...(entry.work.translation
      ? {
          translator: entry.work.translation.translator,
          translationYear: entry.work.translation.year,
        }
      : {}),
    chapter: /^Chapter\s+[^.\s]+/.exec(chapter.name.name)?.[0] ?? chapter.name.name,
  };
  const footnotes = footnoteTargets(doc);
  const translation = entry.work.translation;
  const terms = termsUsed(doc).map(getTerm);
  const vocabulary = new Map<string, TermFile>(terms.map((t) => [t.term, toTermFile(t)]));
  const context: ResolveContext = { workId: entry.work.id, authors: entry.work.authors };
  // When every rendering is AI-assisted, say so once at the top instead of under each paragraph.
  const rendered = rows.flatMap((r) => (r.rendering ? [r.rendering] : []));
  const allAiAssisted = rendered.length > 0 && rendered.every((r) => r.ai_assisted);
  // Each explanation shows once, at the first row it targets (a section explanation
  // targets every passage of its section). Translation notes go with the Original.
  const atRow = new Map<string, { context: Explanation[]; text: Explanation[] }>();
  for (const e of doc.explanations) {
    const row = rows.find((r) => r.ids.some((id) => e.targets.includes(id)));
    const key = row?.ids[0];
    if (!key) continue;
    const slot = atRow.get(key) ?? { context: [], text: [] };
    (e.kind === "translation_note" ? slot.text : slot.context).push(e);
    atRow.set(key, slot);
  }

  return (
    <article className="reader">
      {/* React hoists these into <head>. */}
      {prev && <link rel="prev" href={prev.path} />}
      {next && <link rel="next" href={next.path} />}
      <header className="reader-header">
        <p className="work-title">
          <a href={home}>{entry.work.title}</a>
        </p>
        <h1>{doc.title}</h1>
        <p className="attribution">
          Original: {doc.source.attribution}
          {translation
            ? `, translation by ${translation.translator} (${translation.year})`
            : ""} ·{" "}
          <a href={doc.source.url} rel="external">
            View original source
          </a>
        </p>
        {allAiAssisted && (
          <p className="ai-note">
            <span className="badge">AI-assisted</span> The Plain English in this chapter was drafted
            with the help of AI and is being checked by people. You can compare it with the Original
            at any time.
          </p>
        )}
        <div className="reader-controls">
          <TermCards
            terms={terms}
            context={{ workId: entry.work.id, authors: entry.work.authors }}
          />
        </div>
        {/* Without JavaScript, the contents; with it, the drawer in the reader bar replaces this. */}
        <details className="toc-inline">
          <summary>Contents</summary>
          <TocList chapters={work} current={doc.path} home={home} workTitle={entry.work.title} />
        </details>
      </header>

      <ReadingAids path={doc.path} />
      <SearchHighlight />
      <Annotations path={doc.path} meta={meta} cite={cite} />

      {/* Sticky: the layer toggles stay reachable anywhere in the text (task 023). */}
      <div className="reader-bar">
        <div className="reader-bar-main">
          <TocDrawer
            current={doc.path}
            workPath={home}
            workTitle={entry.work.title}
            chapters={work.map((c) => ({ path: c.path, name: c.name.name, sections: c.sections }))}
          />
          <LayerSwitch />
        </div>
        <ReadingProgress
          path={doc.path}
          meta={meta}
          short={chapter.name.short}
          passages={doc.passages.length}
        />
        <div className="columns-head" aria-hidden="true">
          {LAYERS.map((l) => (
            <span key={l} className={`col-${l}`}>
              {LAYER_LABEL[l]}
            </span>
          ))}
        </div>
      </div>

      <div className="rows">
        {rows.map((row) => {
          const [first, ...rest] = row.ids;
          const notes = atRow.get(first ?? "");
          const words = rowWords(
            row,
            (notes?.context ?? []).map((e) => e.text),
          );
          return (
            <section
              key={first}
              id={first}
              className={row.rendering ? "row" : "row untranslated"}
              data-words={words.join(" ")}
              data-n={ordinal.get(first ?? "")}
            >
              {rest.map((id) => (
                <span key={id} id={id} className="anchor" />
              ))}
              {/* Passage actions (task 031 D): highlight, note, bookmark, copy, share, compare. */}
              <div className="row-tools">
                <button
                  type="button"
                  className="row-actions"
                  data-passage={first}
                  aria-haspopup="true"
                  title="Passage actions"
                  hidden
                >
                  <span className="visually-hidden">
                    Actions for passage {ordinal.get(first ?? "")}
                  </span>
                </button>
              </div>
              <div className="col-plain layer-plain">
                <span className="layer-label">Plain English</span>
                {row.rendering ? (
                  <>
                    {row.rendering.stale && (
                      <p className="notice stale" role="note">
                        The source changed since this was written; it is waiting for review.
                      </p>
                    )}
                    <PlainBlock
                      text={row.rendering.text_raw}
                      type={row.originals[0]?.type ?? "paragraph"}
                      level={row.originals[0]?.level}
                      footnotes={footnotes}
                      terms={{ kind: "tokens", vocabulary, context }}
                    />
                    {row.rendering.ai_assisted && !allAiAssisted && (
                      <p className="badge">AI-assisted</p>
                    )}
                  </>
                ) : (
                  <p className="notice missing">
                    Plain English not yet available for this passage.
                  </p>
                )}
              </div>
              <div className="col-original layer-original" lang="en">
                <span className="layer-label">Original</span>
                {row.originals.map((p) => (
                  <Block
                    key={p.id}
                    passage={p}
                    footnotes={footnotes}
                    terms={{ kind: "annotations", annotations: p.annotations }}
                  />
                ))}
                <TextNotes notes={notes?.text ?? []} footnotes={footnotes} />
              </div>
              <Explain explanations={notes?.context ?? []} footnotes={footnotes} />
            </section>
          );
        })}
      </div>

      <ChapterEnd prev={prev} next={next} home={home} workTitle={entry.work.title} />
    </article>
  );
}

/** The work's chapters, the current one opened to its sections. Server-rendered, no JS. */
function TocList({
  chapters: list,
  current,
  home,
  workTitle,
}: {
  chapters: ChapterInfo[];
  current: string;
  home: string;
  workTitle: string;
}) {
  return (
    <nav aria-label="Contents">
      <p className="toc-work">
        <a href={home}>{workTitle}</a>
      </p>
      <ol className="toc-chapters">
        {list.map((c) => (
          <li key={c.path} className={c.path === current ? "current" : undefined}>
            <a href={c.path} aria-current={c.path === current ? "page" : undefined}>
              {c.name.name}
            </a>
            {c.path === current && c.sections.length > 0 && (
              <ol className="toc-sections">
                {c.sections.map((s) => (
                  <li key={s.id} className={`level-${Math.min(s.level, 6)}`}>
                    <a href={`#${s.id}`}>{s.title}</a>
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * The end of a chapter (task 031, Part A): a card that says so and leads on to
 * the next chapter (or back to the work page after the last), then plain
 * previous/next links. Seeing the card marks the chapter finished (ReadingProgress).
 */
function ChapterEnd({
  prev,
  next,
  home,
  workTitle,
}: {
  prev: ChapterInfo | undefined;
  next: ChapterInfo | undefined;
  home: string;
  workTitle: string;
}) {
  return (
    <footer className="chapter-end">
      <section className="end-card" aria-labelledby="end-card-title">
        <h2 id="end-card-title">Chapter finished</h2>
        {next ? (
          <>
            <p className="end-next-label">Next</p>
            <p className="end-next-title">{next.name.name}</p>
            {next.opening && <p className="end-opening">{next.opening}</p>}
            <a className="start-reading" href={next.path}>
              Next chapter →
            </a>
          </>
        ) : (
          <>
            <p>This is the last chapter of {workTitle}.</p>
            <a className="start-reading" href={home}>
              Back to the work page
            </a>
          </>
        )}
      </section>
      <nav className="chapter-nav" aria-label="Chapters">
        {prev ? (
          <a href={prev.path} rel="prev">
            ← {prev.name.short}: {prev.name.name.replace(/^Chapter\s+\S+\s*/, "")}
          </a>
        ) : (
          <span />
        )}
        <a href={home}>All chapters</a>
        {next ? (
          <a href={next.path} rel="next">
            {next.name.short}: {next.name.name.replace(/^Chapter\s+\S+\s*/, "")} →
          </a>
        ) : (
          <span />
        )}
      </nav>
    </footer>
  );
}

/** How each kind is labelled in the reader (task 025: the layer is "Context"). */
function kindLabel(e: Explanation): string {
  switch (e.kind) {
    case "explanation":
      return e.targets.length > 1 ? "About this section" : "Note";
    case "historical_context":
      return "Background";
    case "interpretation":
      return "Interpretation";
    case "commentary":
      return "Commentary";
    case "translation_note":
      return "Text note";
    default:
      return e.kind;
  }
}

function ExplanationBody({
  e,
  footnotes,
}: {
  e: Explanation;
  footnotes: ReadonlyMap<string, string>;
}) {
  return (
    <>
      {e.text
        .trim()
        .split(/\n\s*\n/)
        .map((p, i) => (
          <p key={i}>
            <LayoutText text={p} footnotes={footnotes} />
          </p>
        ))}
      {e.sources.length > 0 && (
        <ul className="sources">
          {e.sources.map((s, i) => (
            <li key={i}>
              {[s["author"], s["title"], s["publication"], s["year"]].filter(Boolean).join(", ")}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/**
 * The Context layer for one row: section explanations (shown once, at the
 * section's first row), background and notes. The cell is always rendered,
 * empty when the row has none, so the columns of every row line up.
 */
function Explain({
  explanations,
  footnotes,
}: {
  explanations: Explanation[];
  footnotes: ReadonlyMap<string, string>;
}) {
  if (explanations.length === 0) return <div className="col-context layer-context empty" />;
  return (
    <div className="col-context layer-context">
      <span className="layer-label">Context</span>
      {explanations.map((e) => (
        <div
          key={e.id}
          className={e.targets.length > 1 ? "explanation section-explanation" : "explanation"}
        >
          <p className="explanation-kind">
            {kindLabel(e)}
            {e.ai_assisted ? " · AI-assisted" : ""}
          </p>
          <ExplanationBody e={e} footnotes={footnotes} />
        </div>
      ))}
    </div>
  );
}

/**
 * Translation notes are about the source text, not the ideas, so they sit with
 * the Original as a small note that opens on demand (task 025).
 */
function TextNotes({
  notes,
  footnotes,
}: {
  notes: Explanation[];
  footnotes: ReadonlyMap<string, string>;
}) {
  if (notes.length === 0) return null;
  return (
    <details className="text-note">
      <summary>Text note</summary>
      {notes.map((e) => (
        <div key={e.id}>
          <ExplanationBody e={e} footnotes={footnotes} />
          {e.ai_assisted && <p className="muted">AI-assisted</p>}
        </div>
      ))}
    </details>
  );
}

function Block({
  passage,
  footnotes,
  terms,
}: {
  passage: Passage;
  footnotes: ReadonlyMap<string, string>;
  terms: TermMarking;
}) {
  const content = <LayoutText text={passage.text} footnotes={footnotes} terms={terms} />;
  switch (passage.type) {
    case "heading": {
      const H = `h${Math.min(Math.max(passage.level ?? 2, 2), 6)}` as "h2";
      return <H className="block heading">{content}</H>;
    }
    case "blockquote":
      return <blockquote className="block">{content}</blockquote>;
    case "list_item":
      return <p className="block list-item">{content}</p>;
    case "footnote":
      return (
        <p className="block footnote">
          <span className="footnote-label">{passage.label}.</span> {content}
        </p>
      );
    case "table":
      return <div className="block">{content}</div>;
    case "caption":
      return <p className="block caption">{content}</p>;
    case "separator":
      return (
        <p className="block separator" role="separator">
          {content}
        </p>
      );
    default:
      return <p className="block">{content}</p>;
  }
}

/** Plain English: blank lines separate output paragraphs; headings keep their role. */
function PlainBlock({
  text,
  type,
  level,
  footnotes,
  terms,
}: {
  text: string;
  type: string;
  level: number | undefined;
  footnotes: ReadonlyMap<string, string>;
  terms: TermMarking;
}) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  if (type === "heading") {
    const H = `h${Math.min(Math.max(level ?? 2, 2), 6)}` as "h2";
    return (
      <H className="block heading">
        <LayoutText text={paragraphs.join(" ")} footnotes={footnotes} terms={terms} />
      </H>
    );
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={type === "footnote" ? "block footnote" : "block"}>
          <LayoutText text={p} footnotes={footnotes} terms={terms} />
        </p>
      ))}
    </>
  );
}
