// Sanity checks on a parsed document, so new kinds of source pages fail loudly
// instead of importing broken text (docs/architecture/parser-guide.md).
import { parseLayout, toPlainText } from "@plm/schema";
import type { NormalizedDocument } from "./types.ts";

export type InspectFinding = { level: "error" | "warning"; code: string; message: string };

const plain = (layout: string) => {
  const parsed = parseLayout(layout);
  return parsed.ok ? toPlainText(parsed.nodes) : layout;
};

const NAVIGATION =
  /^(next|previous|prev|contents|table of contents|index|back to|top of page|return to|home|marxists internet archive|mia|archive)\b/i;
/** A "Label:" line that starts a block, as in MIA's credits; mere mentions in prose do not count. */
const METADATA =
  /^(transcri(bed|ption)|html markup|proofread|online version|first published|source|written|translated|copyleft|public domain)\b[^.]{0,30}:/i;
/** "[...]" or "…" lines in quotations are content. */
const ELLIPSIS = /^[[(]?\s*(\.\s?){3}\s*[\])]?$|^…$/;
const ESCAPED_TAG = /&lt;\/?[a-z][a-z0-9]*(\s|&gt;)/i;
const MAX_BLOCK = 6000;
/** MIA's 404 page and the Wayback Machine's own pages, which a fetch can return instead of a text. */
const ERROR_PAGE =
  /^(object not found|not found|404|page not found|wayback machine|internet archive|error)\b/i;

export function inspectDocument(doc: NormalizedDocument): InspectFinding[] {
  const findings: InspectFinding[] = [];
  const add = (level: InspectFinding["level"], code: string, message: string) =>
    findings.push({ level, code, message });
  const preview = (s: string) => (s.length > 70 ? `${s.slice(0, 70)}…` : s);

  if (ERROR_PAGE.test(doc.title)) {
    add("error", "error-page", `the page is an error or archive page, not a text ("${doc.title}")`);
  }

  const body = doc.blocks.filter((b) => b.type !== "footnote");
  if (
    !body.some((b) => b.type === "paragraph" || b.type === "blockquote" || b.type === "list_item")
  ) {
    add("error", "no-text", "no paragraphs were found: the page body was probably not recognised");
  }

  const labels = new Set(doc.blocks.filter((b) => b.type === "footnote").map((b) => b.label));
  const refs = new Set(
    [
      ...doc.blocks
        .map((b) => b.text)
        .join(" ")
        .matchAll(/<fn ref="([^"]+)"\/>/g),
    ].map((m) => m[1]),
  );
  const orphanRefs = [...refs].filter((r) => !labels.has(r));
  const orphanNotes = [...labels].filter((l) => !refs.has(l));
  if (orphanRefs.length)
    add("error", "footnote-ref", `footnote references with no note: ${orphanRefs.join(", ")}`);
  if (orphanNotes.length)
    add(
      "warning",
      "footnote-unreferenced",
      `notes that nothing refers to: ${orphanNotes.join(", ")}`,
    );

  let previous = "";
  doc.blocks.forEach((block, i) => {
    const text = plain(block.text);
    const where = `block ${i + 1} (${block.type})`;
    if (!text.trim() && block.type !== "table") {
      // An empty passage is invalid content (and an empty note usually means its body was lost).
      add("error", "empty", `${where}${block.label ? ` [note ${block.label}]` : ""} is empty`);
    } else if (
      block.type !== "table" &&
      block.type !== "separator" &&
      !/[\p{L}\p{N}]/u.test(text) &&
      !ELLIPSIS.test(text)
    ) {
      add("warning", "no-letters", `${where} has no letters or digits: "${preview(text)}"`);
    }
    if (text.length > MAX_BLOCK) {
      add(
        "warning",
        "long-block",
        `${where} is ${text.length} characters: paragraphs may have been merged`,
      );
    }
    if (ESCAPED_TAG.test(block.text)) {
      add(
        "warning",
        "escaped-markup",
        `${where} contains what looks like unconverted HTML: "${preview(text)}"`,
      );
    }
    if (text.length < 80 && NAVIGATION.test(text) && block.type !== "heading") {
      add("warning", "navigation", `${where} looks like site navigation: "${preview(text)}"`);
    }
    if (METADATA.test(text) && block.type !== "footnote") {
      add(
        "warning",
        "metadata",
        `${where} looks like page metadata left in the text: "${preview(text)}"`,
      );
    }
    // Consecutive identical notes ("l.c., p. 48.") are normal; repeated body text is not.
    if (text && text === previous && block.type !== "footnote")
      add("warning", "duplicate", `${where} repeats the block before it: "${preview(text)}"`);
    previous = text;
  });
  return findings;
}
