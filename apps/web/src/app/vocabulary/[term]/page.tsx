import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIndex, getTerm } from "../../../lib/data";

type Props = { params: Promise<{ term: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getIndex().terms.map((t) => ({ term: t.term }));
}

async function load(props: Props) {
  const { term } = await props.params;
  if (!getIndex().terms.some((t) => t.term === term)) notFound();
  return getTerm(term);
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const term = await load(props);
  return {
    title: `${term.original["sg"] ?? term.term} — Vocabulary`,
    alternates: { canonical: `/vocabulary/${term.term}/` },
  };
}

export default async function TermPage(props: Props) {
  const term = await load(props);
  const name = term.original["sg"] ?? term.term;
  return (
    <div className="prose-page">
      <p className="work-title">
        <a href="/vocabulary/">Vocabulary</a>
      </p>
      <h1>{name}</h1>
      <p className="lede">{term.definition.short}</p>
      {term.definition.long && <p>{term.definition.long}</p>}
      {term.definition.sources.length > 0 && (
        <ul className="sources">
          {term.definition.sources.map((s, i) => (
            <li key={i}>{[s["author"], s["title"], s["year"]].filter(Boolean).join(", ")}</li>
          ))}
        </ul>
      )}

      <h2>Forms in the original</h2>
      <ul>
        {Object.entries(term.original).map(([form, word]) => (
          <li key={form}>
            {word} <span className="muted">({form})</span>
          </li>
        ))}
      </ul>

      <h2>Renderings in plain English</h2>
      <p className="muted">
        Usage counts show how often each rendering appears by default in published text. They
        describe community usage, not correctness.
      </p>
      {term.renderings.map((r) => (
        <section key={r.key} className="rendering-option">
          <h3>
            {r.forms["sg"] ?? r.key}
            {r.key === term.default ? <span className="badge"> project default</span> : null}
          </h3>
          <p>
            <strong>Why:</strong> {r.reason}
          </p>
          {r.limitation && (
            <p>
              <strong>Limitation:</strong> {r.limitation}
            </p>
          )}
          <p className="muted">
            {r.usage} {r.usage === 1 ? "use" : "uses"} · forms:{" "}
            {Object.entries(r.forms)
              .map(([f, w]) => `${w} (${f})`)
              .join(", ")}
          </p>
        </section>
      ))}
      {term.scoped_defaults.length > 0 && (
        <>
          <h2>Different defaults for some works</h2>
          <ul>
            {term.scoped_defaults.map((s) => (
              <li key={s.scope}>
                {s.scope}: {s.rendering}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
