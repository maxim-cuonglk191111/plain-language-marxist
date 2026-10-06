import type { DataTerm } from "@plm/schema";
import type { ReactNode } from "react";

type Link = NonNullable<DataTerm["links"]>[number];

/**
 * How terms mentioned inside a card are shown (task 024): on the vocabulary
 * page as plain links; in a term card as buttons that open a nested card,
 * disabled once the stack is full.
 */
export type TermLinkMode = { kind: "page" } | { kind: "card"; full: boolean };

/** Paragraphs of a text split on blank lines, with each paragraph's offset into the text. */
function paragraphs(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = /\n\s*\n/g;
  let at = 0;
  for (let m = re.exec(text); ; m = re.exec(text)) {
    const end = m ? m.index : text.length;
    const raw = text.slice(at, end);
    const lead = raw.length - raw.trimStart().length;
    if (raw.trim()) out.push({ text: raw.trim(), start: at + lead });
    if (!m) break;
    at = m.index + m[0].length;
  }
  return out;
}

/**
 * A term mentioned in a card. Always an inline link, never a button, so page
 * translators keep the sentence whole (task 026). In a card, TermCards opens a
 * nested card on click; in the last card allowed it is plain text.
 */
function CardLink({
  term,
  mode,
  children,
}: {
  term: string;
  mode: TermLinkMode;
  children: ReactNode;
}) {
  if (mode.kind === "card" && mode.full)
    return (
      <span className="term-link term-link-off" title="Close a card to open more">
        {children}
      </span>
    );
  return (
    <a
      href={`/vocabulary/${term}/`}
      className={mode.kind === "card" ? "term-link" : undefined}
      data-term-link={mode.kind === "card" ? term : undefined}
      aria-haspopup={mode.kind === "card" ? "dialog" : undefined}
    >
      {children}
    </a>
  );
}

/** A piece of card text with its term links; `offset` is where it starts in the field. */
function MarkedText({
  text,
  links,
  offset = 0,
  mode,
}: {
  text: string;
  links: readonly Link[];
  offset?: number;
  mode: TermLinkMode;
}) {
  const inside = links.filter((l) => l.start >= offset && l.end <= offset + text.length);
  if (inside.length === 0) return <>{text}</>;
  const parts: ReactNode[] = [];
  let at = 0;
  for (const l of inside) {
    const s = l.start - offset;
    const e = l.end - offset;
    parts.push(text.slice(at, s));
    const word = text.slice(s, e);
    parts.push(
      <CardLink key={s} term={l.term} mode={mode}>
        {word}
      </CardLink>,
    );
    at = e;
  }
  parts.push(text.slice(at));
  return <>{parts}</>;
}

/** The short definition, with its term links. */
export function TermShort({
  term,
  mode,
  text,
}: {
  term: DataTerm;
  mode: TermLinkMode;
  text?: string | undefined;
}) {
  const content = text ?? term.definition.short;
  const links = text ? [] : (term.links ?? []).filter((l) => l.field === "short");
  return <MarkedText text={content} links={links} mode={mode} />;
}

/**
 * The explanatory part of a card (task 022): the everyday meaning to avoid, a
 * sentence from the text, the longer explanation (folded in a card), and related
 * terms. Shared by the card and the vocabulary page.
 */
export function TermDetails({
  term,
  open = false,
  mode = { kind: "page" },
  overrideLong,
}: {
  term: DataTerm;
  open?: boolean | undefined;
  mode?: TermLinkMode | undefined;
  overrideLong?: string | undefined;
}) {
  const links = term.links ?? [];
  const longLinks = links.filter((l) => l.field === "long");
  const longText = overrideLong !== undefined ? overrideLong : term.definition.long;
  const more = longText
    ? paragraphs(longText).map((p) => (
        <p key={p.start}>
          <MarkedText
            text={p.text}
            links={overrideLong !== undefined ? [] : longLinks}
            offset={p.start}
            mode={mode}
          />
        </p>
      ))
    : [];
  const related = (r: { term: string; name: string }) => (
    <CardLink term={r.term} mode={mode}>
      {r.name}
    </CardLink>
  );
  return (
    <>
      {term.not_to_confuse && (
        <p className="term-confuse">
          <span className="term-card-label">Common mix-up</span>{" "}
          <MarkedText
            text={term.not_to_confuse}
            links={links.filter((l) => l.field === "not_to_confuse")}
            mode={mode}
          />
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
              {related(r)}
            </span>
          ))}
        </p>
      )}
      {mode.kind === "card" && mode.full && (
        <p className="term-card-full muted">Close a card to open more.</p>
      )}
    </>
  );
}
