import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutText } from "../../../components/LayoutText";
import { ModeSwitch } from "../../../components/ModeSwitch";
import { allDocuments, findDocument, getDocument } from "../../../lib/data";
import { buildRows, footnoteTargets } from "../../../lib/rows";

const RENDERING = "en-plain";
type Props = { params: Promise<{ path: string[] }> };

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
        <ModeSwitch />
      </header>

      <div className="columns-head" aria-hidden="true">
        <span className="col-original">Original</span>
        <span className="col-plain">Plain English</span>
      </div>

      <div className="rows">
        {rows.map((row) => {
          const [first, ...rest] = row.ids;
          return (
            <section key={first} id={first} className={row.rendering ? "row" : "row untranslated"}>
              {rest.map((id) => (
                <span key={id} id={id} className="anchor" />
              ))}
              <div className="col-original layer-original" lang="en">
                <span className="layer-label">Original</span>
                {row.originals.map((p) => (
                  <Block key={p.id} passage={p} footnotes={footnotes} />
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
                      text={row.rendering.text}
                      type={row.originals[0]?.type ?? "paragraph"}
                      level={row.originals[0]?.level}
                      footnotes={footnotes}
                    />
                  </>
                ) : (
                  <p className="notice missing">
                    Plain English not yet available for this passage.
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </article>
  );
}

type Passage = ReturnType<typeof getDocument>["passages"][number];

function Block({
  passage,
  footnotes,
}: {
  passage: Passage;
  footnotes: ReadonlyMap<string, string>;
}) {
  const content = <LayoutText text={passage.text} footnotes={footnotes} />;
  switch (passage.type) {
    case "heading": {
      const level = Math.min(Math.max(passage.level ?? 2, 2), 6);
      const H = `h${level}` as "h2";
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
}: {
  text: string;
  type: string;
  level: number | undefined;
  footnotes: ReadonlyMap<string, string>;
}) {
  const paragraphs = text.trim().split(/\n\s*\n/);
  if (type === "heading") {
    const H = `h${Math.min(Math.max(level ?? 2, 2), 6)}` as "h2";
    return (
      <H className="block heading">
        <LayoutText text={paragraphs.join(" ")} footnotes={footnotes} />
      </H>
    );
  }
  return (
    <>
      {paragraphs.map((p, i) => (
        <p key={i} className={type === "footnote" ? "block footnote" : "block"}>
          <LayoutText text={p} footnotes={footnotes} />
        </p>
      ))}
    </>
  );
}
