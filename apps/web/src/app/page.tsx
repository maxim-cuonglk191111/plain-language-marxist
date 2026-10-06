import { ContinueShelf } from "../components/WorkProgress";
import { WorkCard } from "../components/WorkCard";
import { getIndex } from "../lib/data";
import { readingPaths } from "../lib/paths";

export default function Home() {
  const index = getIndex();
  const paths = readingPaths();
  // The first document with Plain English, so a new reader lands on something readable.
  const docs = index.works.flatMap((w) => w.documents);
  const start = docs.find((d) => (d.covered["en-plain"] ?? 0) > 0) ?? docs[0];
  return (
    <div className="home">
      <h1>Read the classics in the original and in plain English</h1>
      <p className="lede">
        Every text appears three ways: the <strong>original</strong>, a{" "}
        <strong>plain English</strong> version that modernizes the wording but never the argument,
        and <strong>explanations</strong> that are always labelled as interpretation.
      </p>
      {start && (
        <p>
          <a className="start-reading" href={start.path}>
            Start reading: {start.title} →
          </a>
        </p>
      )}
      <ContinueShelf />
      {paths.length > 0 && (
        <section aria-labelledby="paths-title">
          <h2 id="paths-title">Suggested reading paths</h2>
          <ul>
            {paths.map((p) => (
              <li key={p.id}>
                <a href={`/paths/${p.id}/`}>{p.title}</a>
                {p.description && <span className="muted"> · {p.description}</span>}
              </li>
            ))}
          </ul>
          <p className="small">
            <a href="/paths/">All reading paths</a>
          </p>
        </section>
      )}
      <section aria-labelledby="library-title">
        <h2 id="library-title">Library</h2>
        <div className="library-grid">
          {index.works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
        </div>
      </section>
    </div>
  );
}
