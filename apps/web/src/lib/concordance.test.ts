import type { TermFile } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { around, originalMarks, plainMarks } from "./concordance";

const term = (slug: string, renderings: TermFile["renderings"], dflt: string): TermFile => ({
  schema_version: 5,
  term: slug,
  original: { sg: slug },
  definition: { short: "x" },
  renderings,
  default: dflt,
  scoped_defaults: [],
});
const vocabulary = new Map<string, TermFile>([
  [
    "bourgeoisie",
    term(
      "bourgeoisie",
      {
        "capitalist-class": { forms: { sg: "capitalist class" }, reason: "r" },
        "bourgeois-class": { forms: { sg: "bourgeois class" }, reason: "r" },
      },
      "capitalist-class",
    ),
  ],
  // One rendering, so it is kept as written: marked as a plain word, not a token.
  ["serf", term("serf", { serf: { forms: { sg: "serf", pl: "serfs" }, reason: "r" } }, "serf")],
]);
const ctx = { workId: "work:marx:1848:communist-manifesto", authors: ["marx"] };
const words = (m: { text: string; ranges: { start: number; end: number; term: string }[] }) =>
  m.ranges.map((r) => [r.term, m.text.slice(r.start, r.end)]);

describe("plainMarks", () => {
  it("finds tokens in the default wording, through layout markup, and kept words", () => {
    const m = plainMarks(
      "The <i>{Bourgeoisie}</i> ruled the serfs; the {bourgeoisie} grew.",
      vocabulary,
      ctx,
    );
    expect(m.text).toBe("The Capitalist class ruled the serfs; the capitalist class grew.");
    expect(words(m)).toEqual([
      ["bourgeoisie", "Capitalist class"],
      ["serf", "serfs"],
      ["bourgeoisie", "capitalist class"],
    ]);
  });
});

describe("originalMarks", () => {
  it("finds the nth whole-word occurrence, as the reader marks it", () => {
    const m = originalMarks("The <b>bourgeoisie</b> and the petty bourgeoisie; bourgeoisie.", [
      { term: "bourgeoisie", match: "bourgeoisie", occurrence: 3 },
    ]);
    const third = m.text.lastIndexOf("bourgeoisie"); // the third whole word (the second is inside "petty bourgeoisie" too)
    expect(m.ranges).toEqual([{ term: "bourgeoisie", start: third, end: third + 11 }]);
  });
});

describe("around", () => {
  it("cuts the context at whole words, with ellipses", () => {
    const text = `${"word ".repeat(30)}MATCH${" more".repeat(30)}`;
    const s = around(text, 150, 155, 20);
    expect(s.match).toBe("MATCH");
    expect(s.before.startsWith("…")).toBe(true);
    expect(s.after.endsWith("…")).toBe(true);
    expect(s.before).not.toMatch(/…\S*wor$/);
  });
});
