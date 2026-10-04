import { collectNodes, parseLayout, type LayoutNode, type TermFile } from "@plm/schema";
import { formFor, parseTokens, resolveChoice, type ResolveContext } from "@plm/terms";
import type { ReactNode } from "react";

/** How terms are marked inside the text. */
export type TermMarking =
  | { kind: "none" }
  /** Plain English: {term} tokens become term buttons showing the default wording. */
  | { kind: "tokens"; vocabulary: ReadonlyMap<string, TermFile>; context: ResolveContext }
  /** Original: annotated whole-word occurrences become term buttons. */
  | {
      kind: "annotations";
      annotations: readonly { term: string; match: string; occurrence: number }[];
    };

type Range = { start: number; end: number; term: string };
const WORD = /[\p{L}\p{N}]/u;

/** Character ranges of annotations in the concatenated text nodes (whole words, nth occurrence). */
function annotationRanges(
  text: string,
  annotations: readonly { term: string; match: string; occurrence: number }[],
): Range[] {
  const ranges: Range[] = [];
  for (const a of annotations) {
    let seen = 0;
    for (let i = text.indexOf(a.match); i !== -1; i = text.indexOf(a.match, i + 1)) {
      if (WORD.test(text[i - 1] ?? "") || WORD.test(text[i + a.match.length] ?? "")) continue;
      if (++seen === a.occurrence) {
        ranges.push({ start: i, end: i + a.match.length, term: a.term });
        break;
      }
    }
  }
  return ranges.sort((x, y) => x.start - y.start);
}

const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Renders layout markup (docs/architecture/layout-markup.md) as React. Only
 * the closed tag set is ever rendered; there is no raw HTML injection.
 */
export function LayoutText({
  text,
  footnotes,
  terms = { kind: "none" },
}: {
  text: string;
  footnotes: ReadonlyMap<string, string>;
  terms?: TermMarking;
}) {
  const parsed = parseLayout(text);
  if (!parsed.ok) return <>{text}</>; // plm validate guarantees this never happens for published content

  // Text nodes render in depth-first order, so a running offset maps them onto the ranges.
  const textNodes = collectNodes(parsed.nodes, "text");
  const ranges =
    terms.kind === "annotations"
      ? annotationRanges(textNodes.map((n) => n.value).join(""), terms.annotations)
      : [];
  let offset = 0;

  // Inside a link from the source, terms are not marked: links cannot nest.
  const renderText = (value: string, key: number, inLink: boolean): ReactNode => {
    const start = offset;
    offset += value.length;
    if (terms.kind === "tokens") return renderTokens(value, key, terms, inLink);
    if (inLink) return value;
    const inside = ranges.filter((r) => r.start >= start && r.end <= start + value.length);
    if (inside.length === 0) return value;
    const parts: ReactNode[] = [];
    let at = 0;
    for (const r of inside) {
      parts.push(value.slice(at, r.start - start));
      parts.push(
        <TermMark key={`${key}-${r.start}`} term={r.term}>
          {value.slice(r.start - start, r.end - start)}
        </TermMark>,
      );
      at = r.end - start;
    }
    parts.push(value.slice(at));
    return parts;
  };

  const isTable = parsed.nodes.some((n) => n.type === "tr");
  const children = renderNodes(parsed.nodes, footnotes, renderText, false);
  return isTable ? (
    <div className="table-wrap">
      <table>
        <tbody>{children}</tbody>
      </table>
    </div>
  ) : (
    <>{children}</>
  );
}

/**
 * A marked term. It is an inline link, not a button: page translators (Chrome,
 * Safari, Edge) translate a button apart from its sentence and drop the spaces
 * around it, while a link stays part of the sentence (task 026). With JavaScript
 * TermCards opens the card instead; without it the link opens the vocabulary page.
 */
function TermMark({
  term,
  kept,
  form,
  cap,
  pin,
  children,
}: {
  term: string;
  kept?: boolean;
  form?: string | undefined;
  cap?: boolean;
  pin?: string | undefined;
  children: ReactNode;
}) {
  return (
    <a
      className="term"
      href={`/vocabulary/${term}/`}
      aria-haspopup="dialog"
      data-term={term}
      data-kept={kept ? "1" : undefined}
      data-form={form}
      data-cap={cap ? "1" : undefined}
      data-pin={pin}
    >
      {children}
    </a>
  );
}

type Surface = { match: string; term: string };
const surfaceCache = new WeakMap<ReadonlyMap<string, TermFile>, Surface[]>();

/**
 * Words of terms kept as written (one rendering, so no token): in Plain English
 * they appear as ordinary words, and are marked so their cards open too (task 022).
 * Longest first, so "means of production" wins over a shorter term inside it.
 */
function keptSurfaces(vocabulary: ReadonlyMap<string, TermFile>): Surface[] {
  const cached = surfaceCache.get(vocabulary);
  if (cached) return cached;
  const out: Surface[] = [];
  for (const t of vocabulary.values()) {
    const renderings = Object.values(t.renderings);
    if (renderings.length !== 1 || !renderings[0]) continue;
    for (const w of new Set([...Object.values(renderings[0].forms), ...(t.aliases ?? [])])) {
      out.push({ match: w, term: t.term });
      if (capitalizeFirst(w) !== w) out.push({ match: capitalizeFirst(w), term: t.term });
    }
  }
  out.sort((a, b) => b.match.length - a.match.length);
  surfaceCache.set(vocabulary, out);
  return out;
}

/** Marks whole-word occurrences of kept terms in a plain text segment. */
function markKept(value: string, key: string, surfaces: readonly Surface[]): ReactNode {
  const found: Range[] = [];
  for (const s of surfaces) {
    for (let i = value.indexOf(s.match); i !== -1; i = value.indexOf(s.match, i + 1)) {
      const end = i + s.match.length;
      if (WORD.test(value[i - 1] ?? "") || WORD.test(value[end] ?? "")) continue;
      if (found.some((r) => i < r.end && end > r.start)) continue;
      found.push({ start: i, end, term: s.term });
    }
  }
  if (found.length === 0) return value;
  found.sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let at = 0;
  for (const r of found) {
    parts.push(value.slice(at, r.start));
    parts.push(
      <TermMark key={`${key}-${r.start}`} term={r.term} kept>
        {value.slice(r.start, r.end)}
      </TermMark>,
    );
    at = r.end;
  }
  parts.push(value.slice(at));
  return parts;
}

function renderTokens(
  value: string,
  key: number,
  terms: Extract<TermMarking, { kind: "tokens" }>,
  plain = false,
): ReactNode {
  const parsed = parseTokens(value);
  if (!parsed.ok) return value;
  const surfaces = keptSurfaces(terms.vocabulary);
  return parsed.segments.map((s, i) => {
    if (s.kind === "text") return plain ? s.value : markKept(s.value, `${key}-${i}`, surfaces);
    const term = terms.vocabulary.get(s.term);
    const word = term
      ? formFor(term, resolveChoice(term, terms.context, s.pin), s.form)
      : undefined;
    const shown = word === undefined ? s.raw : s.capitalize ? capitalizeFirst(word) : word;
    if (plain) return shown;
    return (
      <TermMark key={`${key}-${i}`} term={s.term} form={s.form} cap={s.capitalize} pin={s.pin}>
        {shown}
      </TermMark>
    );
  });
}

function renderNodes(
  nodes: readonly LayoutNode[],
  footnotes: ReadonlyMap<string, string>,
  renderText: (value: string, key: number, inLink: boolean) => ReactNode,
  inLink: boolean,
): ReactNode[] {
  const inner = (list: readonly LayoutNode[], link = inLink) =>
    renderNodes(list, footnotes, renderText, link);
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return renderText(node.value, i, inLink);
      case "i":
        return <i key={i}>{inner(node.children)}</i>;
      case "b":
        return <b key={i}>{inner(node.children)}</b>;
      case "sc":
        return (
          <span key={i} className="small-caps">
            {inner(node.children)}
          </span>
        );
      case "sup":
        return <sup key={i}>{inner(node.children)}</sup>;
      case "sub":
        return <sub key={i}>{inner(node.children)}</sub>;
      case "a":
        return (
          <a key={i} href={node.href}>
            {inner(node.children, true)}
          </a>
        );
      case "br":
        return <br key={i} />;
      case "indent":
        return <span key={i} className={`indent indent-${node.level}`} aria-hidden="true" />;
      case "fn": {
        const target = footnotes.get(node.ref);
        return (
          <sup key={i} className="fn-ref">
            {target ? (
              <a href={`#${target}`} aria-label={`Note ${node.ref}`}>
                {node.ref}
              </a>
            ) : (
              node.ref
            )}
          </sup>
        );
      }
      case "tr":
        return <tr key={i}>{inner(node.children)}</tr>;
      case "td":
      case "th": {
        const Cell = node.type;
        return (
          <Cell key={i} colSpan={node.colspan} rowSpan={node.rowspan}>
            {inner(node.children)}
          </Cell>
        );
      }
    }
  });
}
