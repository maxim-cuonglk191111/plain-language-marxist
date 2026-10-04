import { ContinueShelf } from "../components/WorkProgress";
import { getIndex } from "../lib/data";
import { authorName, workPath } from "../lib/reading";

export default function Home() {
  const index = getIndex();
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
      <h2>Library</h2>
      <ul className="library">
        {index.works.map((work) => (
          <li key={work.id}>
            <h3>
              <a href={workPath(work)}>{work.title}</a>
            </h3>
            <p className="byline">
              {work.authors.map(authorName).join(" and ")}, {work.year}
              {work.translation
                ? ` · translated by ${work.translation.translator}, ${work.translation.year}`
                : ""}
            </p>
            <ul>
              {work.documents.map((doc) => (
                <li key={doc.id}>
                  <a href={doc.path}>{doc.title}</a>{" "}
                  <span className="coverage">
                    {doc.covered["en-plain"] ?? 0} of {doc.passages} passages in plain English
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
