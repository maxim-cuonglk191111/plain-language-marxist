// Term tokens and resolution (SDD §6). Runtime-agnostic: used by the CLI, the
// build and the reader in the browser.
import type { TermFile } from "@plm/schema";

export type TokenSegment =
  | { kind: "text"; value: string }
  | {
      kind: "term";
      term: string;
      /** Form name; defaults to "sg". */
      form: string;
      /** Written {Term}: capitalize the first letter of the output. */
      capitalize: boolean;
      /** Written {term=rendering}: this occurrence always shows that rendering. */
      pin?: string;
      raw: string;
      offset: number;
    };

export type TokenResult =
  | { ok: true; segments: TokenSegment[] }
  | { ok: false; error: { message: string; offset: number } };

const TOKEN =
  /^([A-Za-z])([a-z0-9]*(?:-[a-z0-9]+)*)(?::([a-z]+))?(?:=([a-z0-9]+(?:-[a-z0-9]+)*))?$/;
export const DEFAULT_FORM = "sg";

/** Splits text into plain text and term tokens. `\{` is a literal brace. */
export function parseTokens(text: string): TokenResult {
  const segments: TokenSegment[] = [];
  let buffer = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\" && text[i + 1] === "{") {
      buffer += "{";
      i++;
      continue;
    }
    if (ch !== "{") {
      buffer += ch;
      continue;
    }
    const end = text.indexOf("}", i);
    if (end === -1)
      return {
        ok: false,
        error: { message: 'unclosed "{" (write \\{ for a literal brace)', offset: i },
      };
    const raw = text.slice(i, end + 1);
    const m = TOKEN.exec(raw.slice(1, -1));
    if (!m?.[1]) return { ok: false, error: { message: `malformed term token ${raw}`, offset: i } };
    const first = m[1];
    if (buffer) segments.push({ kind: "text", value: buffer });
    buffer = "";
    const token: TokenSegment = {
      kind: "term",
      term: first.toLowerCase() + (m[2] ?? ""),
      form: m[3] ?? DEFAULT_FORM,
      capitalize: first !== first.toLowerCase(),
      raw,
      offset: i,
    };
    if (m[4]) token.pin = m[4];
    segments.push(token);
    i = end;
  }
  if (buffer) segments.push({ kind: "text", value: buffer });
  return { ok: true, segments };
}

/** "original" shows the source's own word; anything else names a rendering. */
export type TermChoice = "original" | (string & {});

export type ResolveContext = {
  /** The reader's choices, by term slug (local preference, SDD §6.3). */
  preferences?: Readonly<Record<string, TermChoice>>;
  /** Applies to every term without its own preference, e.g. "original". */
  preferAll?: TermChoice;
  workId?: string;
  authors?: readonly string[];
};

/** Which rendering a token shows: pin → reader preference → work/author default → global default. */
export function resolveChoice(term: TermFile, ctx: ResolveContext, pin?: string): TermChoice {
  if (pin && pin in term.renderings) return pin;
  const preferred = ctx.preferences?.[term.term] ?? ctx.preferAll;
  if (preferred === "original" || (preferred && preferred in term.renderings)) return preferred;
  const scoped = term.scoped_defaults ?? [];
  const byWork = ctx.workId && scoped.find((s) => s.scope === ctx.workId);
  if (byWork) return byWork.rendering;
  const byAuthor = scoped.find((s) => ctx.authors?.some((a) => s.scope === `author:${a}`));
  if (byAuthor) return byAuthor.rendering;
  return term.default;
}

export function formFor(term: TermFile, choice: TermChoice, form: string): string | undefined {
  const forms = choice === "original" ? term.original : term.renderings[choice]?.forms;
  return forms?.[form];
}

const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const escapeLayout = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type Vocabulary = ReadonlyMap<string, TermFile>;

/** Replaces every token with its resolved wording, escaped for layout markup. */
export function renderTokens(
  text: string,
  vocabulary: Vocabulary,
  ctx: ResolveContext = {},
): { ok: true; text: string } | { ok: false; error: string } {
  const parsed = parseTokens(text);
  if (!parsed.ok) return { ok: false, error: parsed.error.message };
  let out = "";
  for (const seg of parsed.segments) {
    if (seg.kind === "text") {
      out += seg.value;
      continue;
    }
    const term = vocabulary.get(seg.term);
    if (!term) return { ok: false, error: `unknown term ${seg.raw}` };
    const word = formFor(term, resolveChoice(term, ctx, seg.pin), seg.form);
    if (word === undefined)
      return { ok: false, error: `term ${seg.term} has no form "${seg.form}"` };
    out += escapeLayout(seg.capitalize ? capitalizeFirst(word) : word);
  }
  return { ok: true, text: out };
}

export type TokenIssue = { message: string; offset: number };

/** Problems with the tokens in a rendering: syntax, unknown terms, forms or pins. */
export function checkTokens(text: string, vocabulary: Vocabulary): TokenIssue[] {
  const parsed = parseTokens(text);
  if (!parsed.ok) return [parsed.error];
  const issues: TokenIssue[] = [];
  for (const seg of parsed.segments) {
    if (seg.kind !== "term") continue;
    const term = vocabulary.get(seg.term);
    if (!term) {
      issues.push({
        message: `unknown term ${seg.raw} (no content/vocabulary/${seg.term}.yml)`,
        offset: seg.offset,
      });
      continue;
    }
    if (!(seg.form in term.original)) {
      issues.push({
        message: `${seg.raw}: term ${seg.term} has no form "${seg.form}" (declared: ${Object.keys(term.original).join(", ")})`,
        offset: seg.offset,
      });
    }
    if (seg.pin && !(seg.pin in term.renderings)) {
      issues.push({
        message: `${seg.raw}: ${seg.term} has no rendering "${seg.pin}"`,
        offset: seg.offset,
      });
    }
  }
  return issues;
}

/**
 * Community usage (SDD §6.4): for each term, how many published tokens show
 * each rendering by default (no reader preference). Labelled as usage in the
 * UI, never as correctness.
 */
export function usageCounts(
  texts: readonly { text: string; workId?: string; authors?: readonly string[] }[],
  vocabulary: Vocabulary,
): Map<string, Map<TermChoice, number>> {
  const counts = new Map<string, Map<TermChoice, number>>();
  for (const { text, workId, authors } of texts) {
    const parsed = parseTokens(text);
    if (!parsed.ok) continue;
    for (const seg of parsed.segments) {
      if (seg.kind !== "term") continue;
      const term = vocabulary.get(seg.term);
      if (!term) continue;
      const choice = resolveChoice(
        term,
        { ...(workId ? { workId } : {}), ...(authors ? { authors } : {}) },
        seg.pin,
      );
      const perTerm = counts.get(term.term) ?? new Map<TermChoice, number>();
      perTerm.set(choice, (perTerm.get(choice) ?? 0) + 1);
      counts.set(term.term, perTerm);
    }
  }
  return counts;
}
