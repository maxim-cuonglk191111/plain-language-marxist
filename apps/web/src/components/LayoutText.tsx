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

  const renderText = (value: string, key: number): ReactNode => {
    const start = offset;
    offset += value.length;
    if (terms.kind === "tokens") return renderTokens(value, key, terms);
    const inside = ranges.filter((r) => r.start >= start && r.end <= start + value.length);
    if (inside.length === 0) return value;
    const parts: ReactNode[] = [];
    let at = 0;
    for (const r of inside) {
      parts.push(value.slice(at, r.start - start));
      parts.push(
        <button key={`${key}-${r.start}`} type="button" className="term" data-term={r.term}>
          {value.slice(r.start - start, r.end - start)}
        </button>,
      );
      at = r.end - start;
    }
    parts.push(value.slice(at));
    return parts;
  };

  const isTable = parsed.nodes.some((n) => n.type === "tr");
  const children = renderNodes(parsed.nodes, footnotes, renderText);
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

function renderTokens(
  value: string,
  key: number,
  terms: Extract<TermMarking, { kind: "tokens" }>,
): ReactNode {
  const parsed = parseTokens(value);
  if (!parsed.ok) return value;
  return parsed.segments.map((s, i) => {
    if (s.kind === "text") return s.value;
    const term = terms.vocabulary.get(s.term);
    const word = term
      ? formFor(term, resolveChoice(term, terms.context, s.pin), s.form)
      : undefined;
    const shown = word === undefined ? s.raw : s.capitalize ? capitalizeFirst(word) : word;
    return (
      <button
        key={`${key}-${i}`}
        type="button"
        className="term"
        data-term={s.term}
        data-form={s.form}
        data-cap={s.capitalize ? "1" : undefined}
        data-pin={s.pin}
      >
        {shown}
      </button>
    );
  });
}

function renderNodes(
  nodes: readonly LayoutNode[],
  footnotes: ReadonlyMap<string, string>,
  renderText: (value: string, key: number) => ReactNode,
): ReactNode[] {
  const inner = (list: readonly LayoutNode[]) => renderNodes(list, footnotes, renderText);
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return renderText(node.value, i);
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
            {inner(node.children)}
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
