"use client";

import { useEffect } from "react";
import { termPattern } from "../lib/search";

/**
 * After following a search result (?hl=words), marks every word in the text
 * that starts with a search term. It uses the CSS Custom Highlight API, so the
 * page's markup is never changed; browsers without it simply show no marks.
 */
export function SearchHighlight() {
  useEffect(() => {
    const words = new URLSearchParams(location.search).get("hl");
    const re = termPattern((words ?? "").toLowerCase().split(/\s+/));
    const registry = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    const HighlightCtor = (window as unknown as { Highlight?: new (...r: Range[]) => unknown })
      .Highlight;
    if (!re || !registry || !HighlightCtor) return;

    const root = document.querySelector(".rows");
    if (!root) return;
    const ranges: Range[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue ?? "";
      for (const m of text.matchAll(re)) {
        const start = m.index ?? 0;
        const rest = text.slice(start).search(/[^\p{L}\p{N}'’-]/u);
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, rest === -1 ? text.length : start + rest);
        ranges.push(range);
      }
    }
    registry.set("search-hit", new HighlightCtor(...ranges));
    // Styled here, not in globals.css: the CSS build cannot parse ::highlight() yet.
    const style = document.createElement("style");
    style.textContent =
      "::highlight(search-hit){background-color:var(--highlight-strong);color:var(--fg)}";
    document.head.append(style);
    return () => {
      registry.delete("search-hit");
      style.remove();
    };
  }, []);
  return null;
}
