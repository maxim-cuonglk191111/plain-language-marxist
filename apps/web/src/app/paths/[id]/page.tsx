import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PathSteps } from "../../../components/PathSteps";
import { DEFAULT_WPM } from "../../../lib/reading";
import { NO_PATHS, pathStages, pathSteps, readingPaths, totalMinutes } from "../../../lib/paths";

const RENDERING = "en-plain";

type Props = { params: Promise<{ id: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  const ids = readingPaths().map((p) => ({ id: p.id }));
  // A static export needs at least one page per dynamic route. With no paths
  // yet, a placeholder page is built and finalize-export.mjs deletes it.
  return ids.length > 0 ? ids : [{ id: NO_PATHS }];
}

async function load(props: Props) {
  const { id } = await props.params;
  const path = readingPaths().find((p) => p.id === id);
  if (!path) notFound();
  return path;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const path = await load(props);
  return {
    title: `${path.title} — Reading paths`,
    description: path.description,
    alternates: { canonical: `/paths/${path.id}/` },
  };
}

/** A reading path (task 032 C, SDD §5.7): always a suggestion, never "the correct order". */
export default async function PathPage(props: Props) {
  const path = await load(props);
  const steps = pathSteps(path, RENDERING);
  const stages = pathStages(path, RENDERING);
  const others = readingPaths().filter((p) => p.id !== path.id);
  return (
    <div className="prose-page path-page">
      <p className="work-title">
        <a href="/paths/">Reading paths</a>
      </p>
      <p className="path-label">A suggested reading order</p>
      <h1>{path.title}</h1>
      {path.description && <p className="lede">{path.description}</p>}
      <section className="path-rationale" aria-labelledby="why-title">
        <h2 id="why-title">Who suggests this order, and why</h2>
        <p>{path.rationale}</p>
      </section>
      <h2>
        Steps <span className="muted small">· about {totalMinutes(steps)} min in all</span>
      </h2>
      <PathSteps id={path.id} steps={steps} stages={stages} />
      <p className="muted small">
        This is one suggested order, not the only right one: read the steps in any order you like.
        Reading times are for the Plain English at {DEFAULT_WPM} words a minute. A chapter counts as
        read when you finish it in the reader, or when you tick it here. Your progress is saved in
        this browser only.
      </p>
      {others.length > 0 && (
        <section aria-labelledby="others-title">
          <h2 id="others-title">Other suggested paths</h2>
          <ul>
            {others.map((p) => (
              <li key={p.id}>
                <a href={`/paths/${p.id}/`}>{p.title}</a>
                {p.description && <span className="muted"> · {p.description}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
