import type { Passage, TermFile } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { annotatePassages } from "./annotate.ts";

const passage = (id: string, text: string, state: Passage["state"] = "active"): Passage => ({
  id,
  type: "paragraph",
  text,
  hash: `sha256:${"0".repeat(64)}`,
  state,
});
const term = (slug: string, original: Record<string, string>, aliases?: string[]): TermFile => ({
  schema_version: 2,
  term: slug,
  original,
  ...(aliases ? { aliases } : {}),
  definition: { short: "x" },
  renderings: { keep: { forms: original, reason: "x" } },
  default: "keep",
});

const terms = [
  term("bourgeoisie", { sg: "bourgeoisie", adj: "bourgeois" }),
  term("means-of-production", { sg: "means of production" }, ["means of social production"]),
  term("production", { sg: "production" }),
];

describe("annotatePassages", () => {
  it("annotates whole words only, numbering occurrences per match string", () => {
    const { annotations } = annotatePassages(
      [passage("p00001", "The bourgeoisie and the bourgeois; the Bourgeoisie again; bourgeoisies no.")],
      terms,
    );
    expect(annotations).toEqual([
      { passage: "p00001", term: "bourgeoisie", match: "bourgeoisie", occurrence: 1 },
      { passage: "p00001", term: "bourgeoisie", match: "bourgeois", occurrence: 1 },
      { passage: "p00001", term: "bourgeoisie", match: "Bourgeoisie", occurrence: 1 },
    ]);
  });

  it("prefers the longest match and ignores markup and tombstones", () => {
    const { annotations } = annotatePassages(
      [
        passage("p00001", "owners of the <i>means of social production</i> and of production"),
        passage("p00002", "production", "tombstoned"),
      ],
      terms,
    );
    expect(annotations.map((a) => `${a.term}:${a.match}#${a.occurrence}`)).toEqual([
      "means-of-production:means of social production#1",
      "production:production#2",
    ]);
  });

  it("keeps existing annotations and adds only missing ones", () => {
    const existing = [{ passage: "p00001", term: "bourgeoisie", match: "bourgeoisie", occurrence: 1 }];
    const result = annotatePassages([passage("p00001", "the bourgeoisie, the bourgeoisie")], terms, existing);
    expect(result.added).toBe(1);
    expect(result.annotations.map((a) => a.occurrence)).toEqual([1, 2]);
  });
});
