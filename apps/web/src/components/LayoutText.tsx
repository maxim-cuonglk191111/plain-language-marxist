import { parseLayout, type LayoutNode } from "@plm/schema";
import type { ReactNode } from "react";

/**
 * Renders layout markup (docs/architecture/layout-markup.md) as React. Only
 * the closed tag set is ever rendered; there is no raw HTML injection.
 */
export function LayoutText({
  text,
  footnotes,
}: {
  text: string;
  footnotes: ReadonlyMap<string, string>;
}) {
  const parsed = parseLayout(text);
  if (!parsed.ok) return <>{text}</>; // plm validate guarantees this never happens for published content
  const isTable = parsed.nodes.some((n) => n.type === "tr");
  const children = renderNodes(parsed.nodes, footnotes);
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

function renderNodes(
  nodes: readonly LayoutNode[],
  footnotes: ReadonlyMap<string, string>,
): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return node.value;
      case "i":
        return <i key={i}>{renderNodes(node.children, footnotes)}</i>;
      case "b":
        return <b key={i}>{renderNodes(node.children, footnotes)}</b>;
      case "sc":
        return (
          <span key={i} className="small-caps">
            {renderNodes(node.children, footnotes)}
          </span>
        );
      case "sup":
        return <sup key={i}>{renderNodes(node.children, footnotes)}</sup>;
      case "sub":
        return <sub key={i}>{renderNodes(node.children, footnotes)}</sub>;
      case "a":
        return (
          <a key={i} href={node.href}>
            {renderNodes(node.children, footnotes)}
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
        return <tr key={i}>{renderNodes(node.children, footnotes)}</tr>;
      case "td":
      case "th": {
        const Cell = node.type;
        return (
          <Cell key={i} colSpan={node.colspan} rowSpan={node.rowspan}>
            {renderNodes(node.children, footnotes)}
          </Cell>
        );
      }
    }
  });
}
