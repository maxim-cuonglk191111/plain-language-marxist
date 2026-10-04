import { describe, expect, it } from "vitest";
import type { CitationMeta } from "./citation";
import { cardLabels, fitQuote, wrap } from "./quotecard";

/** Every character is half the type size wide. */
const measure = (text: string, size: number) => text.length * size * 0.5;

describe("wrap", () => {
  it("breaks at words within the width", () => {
    expect(wrap("one two three four five", 100, 20, measure)).toEqual([
      "one two",
      "three four",
      "five",
    ]);
  });
  it("puts an overlong word on its own line", () => {
    expect(wrap("a extraordinarily b", 60, 20, measure)).toEqual(["a", "extraordinarily", "b"]);
  });
});

describe("fitQuote", () => {
  it("uses the largest size that fits", () => {
    const fit = fitQuote("A spectre is haunting Europe.", { width: 900, height: 600 }, measure);
    expect(fit).toMatchObject({ size: 64, shortened: false });
  });

  it("goes smaller for a longer quote", () => {
    const long = "word ".repeat(120);
    const fit = fitQuote(long, { width: 900, height: 600 }, measure);
    expect(fit.size).toBeLessThan(64);
    expect(fit.shortened).toBe(false);
    expect(fit.lines.join(" ").split(" ")).toHaveLength(120);
  });

  it("cuts a quote too long for the card at a word, and says so", () => {
    const fit = fitQuote("word, ".repeat(600), { width: 900, height: 300 }, measure);
    expect(fit.shortened).toBe(true);
    expect(fit.lines.at(-1)).toMatch(/word …$/);
  });
});

describe("cardLabels", () => {
  const meta: CitationMeta = {
    authors: "Marx & Engels",
    work: "Manifesto of the Communist Party",
    year: 1848,
    translator: "Samuel Moore",
    translationYear: 1888,
    numeral: "I",
  };
  it("credits the translator on an Original card", () => {
    expect(cardLabels(meta, "original", "Manifesto I.9")).toEqual({
      kind: "ORIGINAL TEXT",
      reference: "Manifesto I.9",
      source:
        "Marx & Engels, Manifesto of the Communist Party (1848), translated by Samuel Moore (1888).",
    });
  });
  it("says a Plain English card is our version, not the original wording", () => {
    const l = cardLabels(meta, "plain", "Manifesto I.9");
    expect(l.kind).toBe("PLAIN ENGLISH VERSION");
    expect(l.source).toMatch(
      /^Plain English version by Plain Language Marxist, not the original wording\./,
    );
  });
});
