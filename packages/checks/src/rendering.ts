// Structural checks on proposed renderings (SDD §8.5). The same code runs in
// the CLI (plm apply), the contributor editor and the community API, so it
// must stay runtime-agnostic: no Node APIs.
import { collectNodes, parseLayout, toPlainText, type TermFile } from "@plm/schema";
import { findHardWords, type HardWord } from "./hard-words.ts";
import { checkTokens, formFor, parseTokens, type Vocabulary } from "@plm/terms";
import type { ExchangeEntry } from "./exchange.ts";

export type SourcePassage = { id: string; text: string; state: "active" | "tombstoned" };

export type Finding = {
  level: "error" | "warning";
  code: string;
  covers: string[];
  message: string;
};

const plain = (layout: string) => {
  const parsed = parseLayout(layout);
  return parsed.ok ? toPlainText(parsed.nodes) : layout;
};

/** Rendering text with tokens replaced by the original wording, for comparison with the source. */
function comparable(text: string, vocabulary: Vocabulary): string {
  const parsed = parseTokens(text);
  if (!parsed.ok) return plain(text);
  const joined = parsed.segments
    .map((s) => {
      if (s.kind === "text") return s.value;
      const term: TermFile | undefined = vocabulary.get(s.term);
      const word = (term && formFor(term, "original", s.form)) ?? s.term;
      // {Term} is capitalized in the output, so compare it capitalized (e.g. for the names check).
      return s.capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join("");
  return plain(joined);
}

const NUMBER = /\d+(?:[.,]\d+)*/g;
const LOGIC_WORDS = [
  "not",
  "never",
  "only",
  "except",
  "unless",
  "because",
  "therefore",
  "however",
  "although",
  "must",
  "may",
  "cannot",
];
// Reporting the text instead of speaking in its voice. Only flagged when the original does not do it too.
const DISTANCING =
  /\b(?:marx|engels|the authors?|the manifesto)\b(?:\s+and\s+(?:marx|engels))?\s+(?:argues?|says?|claims?|calls?|believes?|describes?|writes?|suggests?|thinks?|means?|makes?\s+(?:a|an|the)\b)|\bthey\s+(?:argue|claim|believe|suggest|contend)\b/i;
/**
 * Plain English sentences longer than this are hard for readers learning
 * English (task 025). Split them; never drop a clause to get under it.
 */
export const MAX_SENTENCE_WORDS = 35;
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** Rendering length relative to the original above which it is probably explaining, not rendering. */
const MAX_LENGTH_RATIO = 2;
const FRAMING =
  /\b(?:in other words|to put it simply|simply put|in short|basically|this (?:was|is) an important)\b/i;
/** The original's own summing-up ("In one word"), which "in short" renders, not frames. */
const SUMMING_UP = /\bin (?:one|a) word\b/i;
const QUOTES = /[“”"]/g;

function countWord(text: string, word: string): number {
  const lower = text.toLowerCase();
  const variants =
    word === "not"
      ? [lower.match(/\bnot\b/g)?.length ?? 0, lower.match(/n['’]t\b/g)?.length ?? 0]
      : [lower.match(new RegExp(`\\b${word}\\b`, "g"))?.length ?? 0];
  return variants.reduce((a, b) => a + b, 0);
}

/** Capitalized words that are not at the start of a sentence: likely names. */
function names(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/(^|[.!?:;]\s+|\s)([A-Z][a-zA-ZÀ-ɏ'’-]+)/g)) {
    const [, before = "", word = ""] = m;
    if (before === "" || /[.!?:;]/.test(before)) continue;
    if (word === "I") continue;
    out.add(word.replace(/['’]s$/, ""));
  }
  return out;
}

export type CheckContext = {
  /** Every passage of the document in source order. */
  passages: readonly SourcePassage[];
  vocabulary: Vocabulary;
  /** Surface words that count as terms for the inline-gloss check. */
  termWords?: readonly string[];
  /** Words and phrases too hard for readers learning English (docs/editorial/hard-words.yml). */
  hardWords?: readonly HardWord[];
};

/** Errors block the write; warnings are shown to the contributor and reviewers. */
export function checkRenderings(entries: readonly ExchangeEntry[], ctx: CheckContext): Finding[] {
  const findings: Finding[] = [];
  const byId = new Map(ctx.passages.map((p) => [p.id, p]));
  const activeOrder = new Map(
    ctx.passages.filter((p) => p.state === "active").map((p, i) => [p.id, i]),
  );
  const coveredBy = new Map<string, string>();
  const add = (level: Finding["level"], code: string, covers: string[], message: string) =>
    findings.push({ level, code, covers, message });

  for (const entry of entries) {
    const { covers, text } = entry;
    const label = covers.join(" ");
    let structural = true;
    for (const id of covers) {
      const p = byId.get(id);
      if (!p) {
        add("error", "unknown-passage", covers, `${id} is not a passage of this document`);
        structural = false;
      } else if (p.state !== "active") {
        add(
          "error",
          "tombstoned-passage",
          covers,
          `${id} was removed from the source (tombstoned)`,
        );
        structural = false;
      }
      const other = coveredBy.get(id);
      if (other)
        add("error", "duplicate-passage", covers, `${id} is already covered by "${other}"`);
      else coveredBy.set(id, label);
    }
    if (structural) {
      const idx = covers.map((id) => activeOrder.get(id) ?? -1);
      if (idx.some((v, i) => i > 0 && v !== (idx[i - 1] ?? -2) + 1)) {
        add(
          "error",
          "not-contiguous",
          covers,
          "covered passages must be consecutive, in source order",
        );
      }
    }
    if (!text.trim()) {
      add("error", "empty", covers, "empty rendering");
      continue;
    }
    const layout = parseLayout(text);
    if (!layout.ok) add("error", "markup", covers, `layout markup: ${layout.error.message}`);
    for (const t of checkTokens(text, ctx.vocabulary)) add("error", "token", covers, t.message);
    if (!structural || !layout.ok) continue;

    // Warnings: compare with the original text of the covered passages.
    const original = covers.map((id) => plain(byId.get(id)?.text ?? "")).join(" ");
    const rendered = comparable(text, ctx.vocabulary);

    const notesIn = (layout: string) => {
      const p = parseLayout(layout);
      return p.ok ? collectNodes(p.nodes, "fn").map((n) => n.ref) : [];
    };
    const originalNotes = covers.flatMap((id) => notesIn(byId.get(id)?.text ?? ""));
    const renderedNotes = notesIn(text);
    if ([...originalNotes].sort().join(" ") !== [...renderedNotes].sort().join(" ")) {
      add(
        "warning",
        "footnotes",
        covers,
        `footnote markers differ: original [${originalNotes.join(", ")}], rendering [${renderedNotes.join(", ")}]`,
      );
    }

    const nums = (s: string) => (s.match(NUMBER) ?? []).sort();
    const [on, rn] = [nums(original), nums(rendered)];
    if (on.join(" ") !== rn.join(" ")) {
      add(
        "warning",
        "numbers",
        covers,
        `numbers differ: original [${on.join(", ")}], rendering [${rn.join(", ")}]`,
      );
    }
    const lost = LOGIC_WORDS.filter((w) => countWord(original, w) > countWord(rendered, w));
    if (lost.length)
      add(
        "warning",
        "logic-words",
        covers,
        `fewer occurrences of: ${lost.join(", ")} (check negation and modality)`,
      );
    const oq = original.match(QUOTES)?.length ?? 0;
    const rq = rendered.match(QUOTES)?.length ?? 0;
    if (oq !== rq)
      add(
        "warning",
        "quotations",
        covers,
        `quotation marks: ${oq} in the original, ${rq} in the rendering`,
      );
    const missingNames = [...names(original)].filter((n) => !rendered.includes(n));
    if (missingNames.length)
      add(
        "warning",
        "names",
        covers,
        `names not found in the rendering: ${missingNames.join(", ")}`,
      );
    const ratio = rendered.length / Math.max(original.length, 1);
    if (ratio < 0.5 || ratio > MAX_LENGTH_RATIO) {
      add(
        "warning",
        "length",
        covers,
        `length is ${ratio.toFixed(1)}× the original (aim for about 0.8–1.5×)`,
      );
    }
    const longest = sentences(rendered).reduce((max, s) => Math.max(max, wordCount(s)), 0);
    if (longest > MAX_SENTENCE_WORDS) {
      add(
        "warning",
        "long-sentence",
        covers,
        `a sentence has ${longest} words; split sentences over ${MAX_SENTENCE_WORDS} words, keeping every clause (task 025)`,
      );
    }
    const hard = findHardWords(rendered, ctx.hardWords ?? []);
    if (hard.length) {
      add(
        "warning",
        "hard-word",
        covers,
        `not plain enough for readers learning English: ${hard.map((w) => `"${w.match}" (use ${w.use})`).join(", ")}`,
      );
    }
    if (original.includes("?") && !rendered.includes("?"))
      add("warning", "question", covers, "the original asks a question; the rendering does not");
    if (DISTANCING.test(rendered) && !DISTANCING.test(original)) {
      add(
        "warning",
        "distancing",
        covers,
        'reports the text ("Marx and Engels argue…") instead of keeping the authors\' voice',
      );
    }
    if (FRAMING.test(rendered) && !FRAMING.test(original) && !SUMMING_UP.test(original))
      add("warning", "framing", covers, "adds a framing or commentary sentence");
    // A gloss is a term followed by a dash, parenthesis or "meaning…" that introduces words the
    // original does not have. Dashes that only restructure the original sentence are fine.
    const originalLower = original.toLowerCase();
    for (const word of ctx.termWords ?? []) {
      const gloss = new RegExp(
        `\\b${word.replace(/[-]/g, "\\-")}\\b\\s*(?:—|–|--|\\(|,\\s*(?:meaning|that is|i\\.e\\.|which means))\\s*([^—–().;:]*)`,
        "gi",
      );
      const added = [...rendered.matchAll(gloss)].some((m) => {
        const tail = (m[1] ?? "").trim().toLowerCase().split(/\s+/).slice(0, 4).join(" ");
        return tail.length > 0 && !originalLower.includes(tail);
      });
      if (added) {
        add(
          "warning",
          "gloss",
          covers,
          `defines "${word}" inline; definitions belong on the term card`,
        );
        break;
      }
    }
  }
  return findings;
}
