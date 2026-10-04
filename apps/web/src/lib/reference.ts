// Passage references (task 032 A), like "John 3:16" in a Bible app:
// "Manifesto II.17" = the work's short title, the chapter number from its
// heading, and the passage number from its ID (p00017). Passage IDs are never
// renumbered (the source is immutable), so a reference stays valid.

export type RefChapter = { path: string; numeral: string; passages: number };
export type RefWork = { short: string; title: string; chapters: RefChapter[] };

export const passageNumber = (id: string) => Number(id.replace(/\D/g, ""));
export const passageId = (n: number) => `p${String(n).padStart(5, "0")}`;

/** "Manifesto II.17", or "II.17" without a work. */
export const formatRef = (prefix: string, passage: string | number) =>
  `${prefix}.${typeof passage === "number" ? passage : passageNumber(passage)}`;

/** Several passages: "II.13–15" when they run on, otherwise the first and a count. */
export function formatRange(prefix: string, ids: readonly string[]): string {
  const nums = [...new Set(ids.map(passageNumber))].sort((a, b) => a - b);
  const first = nums[0] ?? 0;
  const last = nums.at(-1) ?? first;
  if (nums.length <= 1) return `${prefix}.${first}`;
  if (last - first === nums.length - 1) return `${prefix}.${first}–${last}`;
  return `${prefix}.${first} and ${nums.length - 1} more`;
}

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100 };

/** "II" → 2, "iv" → 4, "12" → 12; NaN for anything else. */
export function chapterNumber(token: string): number {
  const t = token.toLowerCase();
  if (/^\d+$/.test(t)) return Number(t);
  if (!/^[ivxlc]+$/.test(t)) return NaN;
  let total = 0;
  for (let i = 0; i < t.length; i++) {
    const v = ROMAN[t[i] ?? ""] ?? 0;
    const next = ROMAN[t[i + 1] ?? ""] ?? 0;
    total += v < next ? -v : v;
  }
  return total;
}

export type RefResult =
  | { ok: true; path: string; passage: string | null; label: string }
  | { ok: false; message: string };

/**
 * Reads what a reader typed as a reference: "II.17", "Manifesto 2.17",
 * "ch2 17", "chapter 2", "Manifesto II". Returns null when the text does not
 * look like a reference at all (so search can treat it as words), or an error
 * in plain words when it does but points nowhere.
 */
export function parseRef(
  input: string,
  works: readonly RefWork[],
  current?: RefWork,
): RefResult | null {
  let rest = input.trim().toLowerCase().replace(/\s+/g, " ");
  let work: RefWork | undefined;
  for (const w of works) {
    for (const name of [w.short, w.title].map((n) => n.toLowerCase())) {
      if (rest === name || rest.startsWith(`${name} `)) {
        work = w;
        rest = rest.slice(name.length).trim();
        break;
      }
    }
    if (work) break;
  }
  const m = /^(ch(?:apter)?\.? ?)?([ivxlc]+|\d+)(?:(?: ?[.:,] ?| )(?:p|¶)? ?(\d+))?$/.exec(rest);
  if (!m)
    return work && !rest
      ? { ok: false, message: `Add a chapter, e.g. “${work.short} II.17”.` }
      : null;
  const [, chWord, chToken = "", pToken] = m;
  // A lone "civil", "mix" or "1848" is a search, not a chapter: a reference names the work,
  // says "ch"/"chapter", or gives a passage.
  if (!work && !chWord && !pToken) return null;
  const target = work ?? current ?? (works.length === 1 ? works[0] : undefined);
  if (!target) return { ok: false, message: "Say which work, e.g. “Manifesto II.17”." };

  const n = chapterNumber(chToken);
  const chapter = target.chapters.find((c) => chapterNumber(c.numeral) === n);
  if (!chapter)
    return { ok: false, message: `${target.short} has no chapter ${chToken.toUpperCase()}.` };
  const prefix = `${target.short} ${chapter.numeral}`;
  if (pToken === undefined) return { ok: true, path: chapter.path, passage: null, label: prefix };
  const p = Number(pToken);
  if (p < 1 || p > chapter.passages)
    return {
      ok: false,
      message: `${prefix} has ${chapter.passages} passages, so there is no passage ${p}.`,
    };
  return { ok: true, path: chapter.path, passage: passageId(p), label: formatRef(prefix, p) };
}
