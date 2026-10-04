/**
 * Words and phrases a reader with intermediate English (about CEFR B1–B2)
 * would need a dictionary for, each with a plain replacement. The list lives in
 * docs/editorial/hard-words.yml so editors can extend it whenever a reader
 * stumbles; plm warns when Plain English uses one, and the LLM prompt tells the
 * drafter to avoid them (task 025).
 */
export type HardWord = { match: string; use: string };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every listed word or phrase found in `text`, whole words only, ignoring case. */
export function findHardWords(text: string, list: readonly HardWord[]): HardWord[] {
  return list.filter((w) =>
    new RegExp(`(?<![\\p{L}\\p{N}])${escape(w.match)}(?![\\p{L}\\p{N}])`, "iu").test(text),
  );
}

/** The prompt's "words to avoid" block. */
export function hardWordTable(list: readonly HardWord[]): string {
  return list.length ? list.map((w) => `- "${w.match}": use ${w.use}`).join("\n") : "(none listed)";
}

/** Parses the YAML-free shape loaded by the CLI: an array of { match, use }. */
export function parseHardWords(data: unknown): HardWord[] {
  if (!Array.isArray(data)) throw new Error("hard-words.yml must be a list of { match, use }");
  return data.map((entry, i) => {
    const e = entry as Partial<HardWord> | null;
    if (!e || typeof e.match !== "string" || typeof e.use !== "string" || !e.match.trim())
      throw new Error(`hard-words.yml entry ${i + 1} needs a non-empty "match" and a "use"`);
    return { match: e.match.trim(), use: e.use.trim() };
  });
}
