// Independent check on a parser: which text of the source page did NOT make it into
// the output? It looks only at the raw page and the output's plain text, never at the
// parser's own rules, so silently dropped text shows up here (parser-guide.md).
import { parseLayout, toPlainText } from "@plm/schema";
import { parse, type DefaultTreeAdapterMap } from "parse5";
import { decodeHtml } from "./decode.ts";
import type { NormalizedDocument } from "./types.ts";

type Node = DefaultTreeAdapterMap["childNode"];
const SKIP = new Set(["script", "style", "head", "title", "noscript"]);
const SHINGLE = 4;

/** Inline elements join their text without a space (C<sub>4</sub>H… stays "C4H…"). */
const INLINE = new Set([
  "a",
  "span",
  "i",
  "em",
  "b",
  "strong",
  "sub",
  "sup",
  "small",
  "big",
  "font",
  "u",
  "tt",
  "abbr",
  "acronym",
  "cite",
  "q",
  "s",
  "strike",
  "code",
]);

function pageText(node: Node | DefaultTreeAdapterMap["document"]): string {
  if (node.nodeName === "#text") return (node as { value: string }).value;
  if ("tagName" in node && SKIP.has(node.tagName)) return " ";
  if (!("childNodes" in node)) return " ";
  const inner = node.childNodes.map(pageText).join("");
  return "tagName" in node && INLINE.has(node.tagName) ? inner : ` ${inner} `;
}

const words = (text: string) =>
  text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .split(/[^\p{L}\p{N}']+/u)
    .filter(Boolean);

export type MissingText = {
  sourceWords: number;
  missingWords: number;
  /** Runs of consecutive source words absent from the output, longest first. */
  runs: string[];
};

/** Source words not covered by any shared run of SHINGLE words in the output. */
export function missingText(bytes: Uint8Array, doc: NormalizedDocument, minRun = 6): MissingText {
  const source = words(pageText(parse(decodeHtml(bytes))));
  const output = words(
    doc.blocks
      .map((b) => {
        const p = parseLayout(b.text);
        return p.ok ? toPlainText(p.nodes) : b.text;
      })
      .join(" "),
  );
  const shingles = new Set<string>();
  for (let i = 0; i + SHINGLE <= output.length; i++)
    shingles.add(output.slice(i, i + SHINGLE).join(" "));

  const covered = new Array<boolean>(source.length).fill(false);
  for (let i = 0; i + SHINGLE <= source.length; i++) {
    if (shingles.has(source.slice(i, i + SHINGLE).join(" ")))
      for (let j = i; j < i + SHINGLE; j++) covered[j] = true;
  }
  const runs: string[] = [];
  let missing = 0;
  for (let i = 0; i < source.length;) {
    if (covered[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < source.length && !covered[j]) j++;
    if (j - i >= minRun) {
      runs.push(source.slice(i, j).join(" "));
      missing += j - i;
    }
    i = j;
  }
  return {
    sourceWords: source.length,
    missingWords: missing,
    runs: runs.sort((a, b) => b.length - a.length),
  };
}
