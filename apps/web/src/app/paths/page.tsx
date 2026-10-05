import type { Metadata } from "next";
import { pathSteps, readingPaths, totalMinutes } from "../../lib/paths";

const RENDERING = "en-plain";

export const metadata: Metadata = {
  title: "Reading paths",
  alternates: { canonical: "/paths/" },
};

/** Every reading path (task 032 C). Each is a suggestion; none is ranked above another. */
export default function PathsIndex() {
  const paths = readingPaths();
  return (
    <div className="prose-page">
      <h1>Reading paths</h1>
      <p className="lede">
        Suggested orders for reading the texts, each with a note on who suggests it and why. They
        are suggestions, not the correct way to read: pick one that suits you, or none.
      </p>
      {paths.length === 0 ? (
        <p>There are no reading paths yet.</p>
      ) : (
        <ul className="path-list">
          {paths.map((p) => {
            const steps = pathSteps(p, RENDERING);
            return (
              <li key={p.id}>
                <h2>
                  <a href={`/paths/${p.id}/`}>{p.title}</a>
                </h2>
                {p.description && <p>{p.description}</p>}
                <p className="byline">
                  {steps.length} {steps.length === 1 ? "step" : "steps"} · about{" "}
                  {totalMinutes(steps)} min
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
