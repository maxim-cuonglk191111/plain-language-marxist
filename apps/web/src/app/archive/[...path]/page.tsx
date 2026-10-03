import type { DataDocument, TermFile } from "@plm/schema";
import type { ResolveContext } from "@plm/terms";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutText, type TermMarking } from "../../../components/LayoutText";
import { ModeSwitch } from "../../../components/ModeSwitch";
import { TermCards } from "../../../components/TermCards";
import { allDocuments, findDocument, getDocument, getTerm } from "../../../lib/data";
import { buildRows, footnoteTargets } from "../../../lib/rows";
import { termsUsed, toTermFile } from "../../../lib/terms";

const RENDERING = "en-plain";
type Props = { params: Promise<{ path: string[] }> };
type Passage = DataDocument["passages"][number];
type Explanation = DataDocument["explanations"][number];

const KIND_LABEL: Record<string, string> = {
  explanation: "Explanation",
  historical_context: "Historical context",
  interpretation: "Interpretation",
  commentary: "Commentary",
  translation_note: "Translation note",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return allDocuments().map((d) => ({ path: d.path.replace(/^\/archive\//, "").split("/") }));
}

async function load(props: Props) {
  const { path } = await props.params;
  const entry = findDocument(`/archive/${path.map(decodeURIComponent).join("/")}`);
  if (!entry) notFound();
  return { entry, doc: getDocument(entry) };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { entry, doc } = await load(props);
  return {
    title: `${doc.title} — ${entry.work.title}`,
    alternates: { canonical: doc.path },
  };
}

export default async function DocumentPage(props: Props) {
  const { entry, doc } = await load(props);
  const rows = buildRows(doc, RENDERING);
  const footnotes = footnoteTargets(doc);
  const translation = entry.work.translation;
  const terms = termsUsed(doc).map(getTerm);
  const vocabulary = new Map<string, TermFile>(terms.map((t) => [t.term, toTermFile(t)]));
  const context: ResolveContext = { workId: entry.work.id, authors: entry.work.authors };
  const explanationsFor = (ids: string[]) =>
    doc.explanations.filter((e) => e.targets.some((t) => ids.includes(t)));

  return (
    <article className="reader">
      <header className="reader-header">
        <p className="work-title">{entry.work.title}</p>
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
        <div className="reader-controls">
          <ModeSwitch />
          <TermCards
            terms={terms}
            context={{ workId: entry.work.id, authors: entry.work.authors }}
          />
        </div>
      </header>

      <div className="columns-head" aria-hidden="true">
        <span className="col-original">Original</span>
        <span className="col-plain">Plain English</span>
      </div>

      <div className="rows">
        {rows.map((row) => {
          const [first, ...rest] = row.ids;
          const explanations = explanationsFor(row.ids);
          return (
            <section key={first} id={first} className={row.rendering ? "row" : "row untranslated"}>
              {rest.map((id) => (
                <span key={id} id={id} className="anchor" />
              ))}
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
                    {row.rendering.ai_assisted && <p className="badge">AI-assisted</p>}
                  </>
                ) : (
                  <p className="notice missing">
                    Plain English not yet available for this passage.
                  </p>
                )}
              </div>
              {explanations.length > 0 && (
                <Explain explanations={explanations} footnotes={footnotes} />
              )}
            </section>
          );
        })}
      </div>
    </article>
  );
}

/** Per-passage explanations, labelled by kind. <details> works without JavaScript. */
function Explain({
  explanations,
  footnotes,
}: {
  explanations: Explanation[];
  footnotes: ReadonlyMap<string, string>;
}) {
  return (
    <details className="explain">
      <summary>Explain</summary>
      {explanations.map((e) => (
        <div key={e.id} className="explanation">
          <p className="explanation-kind">
            {KIND_LABEL[e.kind] ?? e.kind}
            {e.ai_assisted ? " · AI-assisted" : ""}
          </p>
          <p>
            <LayoutText text={e.text} footnotes={footnotes} />
          </p>
          {e.sources.length > 0 && (
            <ul className="sources">
              {e.sources.map((s, i) => (
                <li key={i}>
                  {[s["author"], s["title"], s["publication"], s["year"]]
                    .filter(Boolean)
                    .join(", ")}
                </li>
              ))}
            </ul>
          )}
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
