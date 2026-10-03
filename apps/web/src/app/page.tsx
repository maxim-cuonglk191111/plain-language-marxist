import { getIndex } from "../lib/data";

const authorName = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1);

export default function Home() {
  const index = getIndex();
  return (
    <div className="home">
      <h1>Read the classics in the original and in plain English</h1>
      <p className="lede">
        Every text appears three ways: the <strong>original</strong>, a{" "}
        <strong>plain English</strong> version that modernizes the wording but never the argument,
        and <strong>explanations</strong> that are always labelled as interpretation.
      </p>
      <h2>Library</h2>
      <ul className="library">
        {index.works.map((work) => (
          <li key={work.id}>
            <h3>{work.title}</h3>
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
