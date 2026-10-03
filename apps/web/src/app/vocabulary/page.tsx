import type { Metadata } from "next";
import { getIndex, getTerm } from "../../lib/data";

export const metadata: Metadata = {
  title: "Vocabulary",
  alternates: { canonical: "/vocabulary/" },
};

export default function VocabularyIndex() {
  const terms = getIndex().terms.map((t) => getTerm(t.term));
  return (
    <div className="prose-page">
      <h1>Vocabulary</h1>
      <p className="lede">
        Terms used in the texts, what they meant, and how the plain English layer renders them.
        Several renderings can be valid; the project default is a reviewed choice, not a claim that
        the others are wrong.
      </p>
      <dl className="vocabulary-list">
        {terms.map((t) => (
          <div key={t.term}>
            <dt>
              <a href={`/vocabulary/${t.term}/`}>{t.original["sg"] ?? t.term}</a>
            </dt>
            <dd>{t.definition.short}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
