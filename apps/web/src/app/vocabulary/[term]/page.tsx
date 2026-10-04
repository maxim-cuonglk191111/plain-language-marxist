import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TermDetails, TermShort } from "../../../components/TermDetails";
import { concordance, type Occurrence } from "../../../lib/concordance";
import { getIndex, getTerm } from "../../../lib/data";

const RENDERING = "en-plain";

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
      <p className="lede">
        <TermShort term={term} mode={{ kind: "page" }} />
      </p>
      <TermDetails term={term} open />

      {term.definition.sources.length > 0 && (
        <ul className="sources">
          {term.definition.sources.map((s, i) => (
            <li key={i}>{[s["author"], s["title"], s["year"]].filter(Boolean).join(", ")}</li>
          ))}
        </ul>
      )}

      <Appears occurrences={concordance(RENDERING).get(term.term) ?? []} />

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

const LAYER_NAME = { original: "Original", plain: "Plain English" } as const;

/**
 * Every place the term is marked (task 032 B), like a concordance in a study
 * Bible: grouped by work and chapter, each linked to its passage with that
 * layer shown and the word highlighted. Long lists start folded.
 */
function Appears({ occurrences }: { occurrences: Occurrence[] }) {
  const count = (list: Occurrence[], layer: Occurrence["layer"]) =>
    list.filter((o) => o.layer === layer).length;
  const works = new Map<string, Map<string, Occurrence[]>>();
  for (const o of occurrences) {
    const chapters = works.get(o.work) ?? new Map<string, Occurrence[]>();
    chapters.set(o.chapter, [...(chapters.get(o.chapter) ?? []), o]);
    works.set(o.work, chapters);
  }
  return (
    <section className="appears" aria-labelledby="appears">
      <h2 id="appears">Where this term appears ({occurrences.length})</h2>
      {occurrences.length === 0 ? (
        <p className="muted">It is not marked in any published chapter yet.</p>
      ) : (
        <p className="muted">
          {count(occurrences, "original")} in the Original · {count(occurrences, "plain")} in the
          Plain English. Plain English lines are our version, not the original wording.
        </p>
      )}
      {[...works].map(([work, chapters]) => (
        <div key={work}>
          <h3>{work}</h3>
          {[...chapters].map(([chapter, list]) => (
            <details key={chapter} open={occurrences.length <= 30}>
              <summary>
                {chapter}{" "}
                <span className="muted">
                  ({count(list, "original")} Original, {count(list, "plain")} Plain English)
                </span>
              </summary>
              <ol className="appears-list">
                {list.map((o, i) => (
                  <li key={i}>
                    <a
                      href={`${o.path}?layers=${o.layer}&hl=${encodeURIComponent(o.match)}#${o.passage}`}
                    >
                      {o.ref}
                    </a>{" "}
                    <span className="layer-tag">{LAYER_NAME[o.layer]}</span>{" "}
                    <span className={o.layer === "original" ? "appears-original" : undefined}>
                      {o.before}
                      <mark>{o.match}</mark>
                      {o.after}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>
      ))}
    </section>
  );
}
