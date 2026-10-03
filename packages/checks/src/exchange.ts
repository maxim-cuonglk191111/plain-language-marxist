// Exchange format for LLM-assisted drafting (SDD §8.4):
//
//   === p00017
//   rendering text…
//   === p00031 p00032
//   one rendering covering two passages…

export type ExchangeEntry = { covers: string[]; text: string };

export type ExchangeResult =
  { ok: true; entries: ExchangeEntry[] } | { ok: false; error: { message: string; line: number } };

const HEADER = /^===\s+(.*)$/;
const PASSAGE_ID = /^p\d{5}$/;
const FENCE = /^\s*```/;

export function parseExchange(input: string): ExchangeResult {
  let lines = input.replace(/\r\n?/g, "\n").split("\n");
  // LLM chat interfaces often wrap the whole answer in a code fence.
  const firstContent = lines.findIndex((l) => l.trim());
  const lastContent = lines.length - 1 - [...lines].reverse().findIndex((l) => l.trim());
  if (
    firstContent !== -1 &&
    FENCE.test(lines[firstContent] ?? "") &&
    FENCE.test(lines[lastContent] ?? "") &&
    firstContent < lastContent
  ) {
    lines = lines.slice(firstContent + 1, lastContent);
  }

  const entries: ExchangeEntry[] = [];
  let current: { covers: string[]; lines: string[] } | null = null;
  const finish = () => {
    if (current) entries.push({ covers: current.covers, text: current.lines.join("\n").trim() });
  };

  for (const [i, line] of lines.entries()) {
    const header = HEADER.exec(line.trim());
    if (header) {
      finish();
      const ids = (header[1] ?? "").split(/[\s,]+/).filter(Boolean);
      const bad = ids.find((id) => !PASSAGE_ID.test(id));
      if (ids.length === 0 || bad) {
        return {
          ok: false,
          error: {
            message: `header "${line.trim()}" must list passage IDs like p00017`,
            line: i + 1,
          },
        };
      }
      current = { covers: ids, lines: [] };
      continue;
    }
    if (!current) {
      if (line.trim()) {
        return {
          ok: false,
          error: {
            message: `text before the first "=== p…" header (delete any introduction)`,
            line: i + 1,
          },
        };
      }
      continue;
    }
    current.lines.push(line);
  }
  finish();
  if (entries.length === 0)
    return { ok: false, error: { message: 'no "=== p…" headers found', line: 1 } };
  return { ok: true, entries };
}

export function serializeExchange(entries: readonly ExchangeEntry[]): string {
  return `${entries.map((e) => `=== ${e.covers.join(" ")}\n${e.text.trim()}`).join("\n")}\n`;
}
