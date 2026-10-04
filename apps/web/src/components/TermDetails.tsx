import type { DataTerm } from "@plm/schema";

const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * The explanatory part of a card (task 022): the everyday meaning to avoid, a
 * sentence from the text, related terms, and the longer explanation folded away
 * so the card stays short. Shared by the card and the vocabulary page.
 */
export function TermDetails({ term, open = false }: { term: DataTerm; open?: boolean }) {
  const long = term.definition.long ? paragraphs(term.definition.long) : [];
  const more = long.map((p, i) => <p key={i}>{p}</p>);
  return (
    <>
      {term.not_to_confuse && (
        <p className="term-confuse">
          <span className="term-card-label">Common mix-up</span> {term.not_to_confuse}
        </p>
      )}
      {term.example && (
        <figure className="term-example">
          <blockquote>{term.example.text}</blockquote>
          <figcaption>
            <a href={term.example.href}>
              {term.example.title}, {term.example.passage}
            </a>
          </figcaption>
        </figure>
      )}
      {more.length > 0 &&
        (open ? (
          more
        ) : (
          <details className="term-more">
            <summary>Read more</summary>
            {more}
          </details>
        ))}
      {term.related && term.related.length > 0 && (
        <p className="term-related">
          <span className="term-card-label">Related</span>{" "}
          {term.related.map((r, i) => (
            <span key={r.term}>
              {i > 0 && ", "}
              <a href={`/vocabulary/${r.term}/`} data-term-link={r.term}>
                {r.name}
              </a>
            </span>
          ))}
        </p>
      )}
    </>
  );
}
