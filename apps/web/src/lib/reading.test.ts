import type { DataDocument } from "@plm/schema";
import { describe, expect, it } from "vitest";
import {
  chapterName,
  countWords,
  groupByParts,
  minutes,
  openingLine,
  plainOf,
  sections,
} from "./reading";

const doc = (
  passages: Partial<DataDocument["passages"][number]>[],
  extra?: Partial<DataDocument>,
): DataDocument => ({
  version: 1,
  id: "document:x",
  work_id: "work:x",
  title: "Communist Manifesto (Chapter 3)",
  path: "/archive/x/ch03.htm",
  source: {
    provider: "mia",
    url: "https://example.org",
    retrieved_at: "2026-01-01",
    attribution: "",
  },
  ...extra,
  passages: passages.map((p, i) => ({
    id: `p${String(i + 1).padStart(5, "0")}`,
    type: "paragraph",
    text: "",
    annotations: [],
    ...p,
  })),
  renderings: {},
  explanations: [],
});

describe("countWords", () => {
  it("counts words, keeping contractions and hyphenated words whole", () => {
    expect(countWords("The bourgeoisie, historically, has played a most revolutionary part.")).toBe(
      9,
    );
    expect(countWords("don’t over-production 1848")).toBe(3);
    expect(countWords("  — ")).toBe(0);
  });

  it("ignores layout markup", () => {
    expect(countWords(plainOf('Bourgeois and Proletarians<fn ref="1"/>'))).toBe(3);
  });
});

describe("chapterName", () => {
  it("uses the chapter heading, with a short label", () => {
    const d = doc([
      { type: "heading", text: "Chapter III. Socialist and Communist Literature" },
      { type: "heading", text: "1. Reactionary Socialism" },
    ]);
    const name = chapterName(d, 3);
    expect(name).toEqual({
      name: "Chapter III. Socialist and Communist Literature",
      short: "Ch. III",
    });
    expect(sections(d, name).map((s) => s.title)).toEqual(["1. Reactionary Socialism"]);
  });

  it("without a chapter heading, is named by its numbered sections", () => {
    const vpp = (headings: string[]) =>
      chapterName(doc(headings.map((text) => ({ type: "heading", text }))), 2).name;
    expect(vpp(["VI. Value and Labour", "VII. Labouring Power", "XI. The Different Parts"])).toBe(
      "VI–XI. Value and Labour …",
    );
    expect(vpp(["Preliminary", "I. Production and Wages", "V. Wages and Prices"])).toBe(
      "Preliminary; I–V. Production and Wages …",
    );
    expect(vpp(["XIV. The Struggle between Capital and Labour"])).toBe(
      "XIV. The Struggle between Capital and Labour",
    );
  });

  it("parses word-based chapter headings (e.g. Chapter One)", () => {
    const d = doc([{ type: "heading", text: "Chapter One: Commodities" }]);
    expect(chapterName(d, 1)).toEqual({
      name: "Chapter One: Commodities",
      short: "Ch. 1",
    });
    const d33 = doc([
      { type: "heading", text: "Chapter Thirty-Three: The Modern Theory of Colonisation" },
    ]);
    expect(chapterName(d33, 33)).toEqual({
      name: "Chapter Thirty-Three: The Modern Theory of Colonisation",
      short: "Ch. 33",
    });
  });

  it("identifies prefaces and afterwords as front matter", () => {
    const d = doc([{ type: "heading", text: "1867 Preface to the First German Edition" }], {
      id: "document:marx:1867:capital-vol1:pref-1st",
    });
    expect(chapterName(d, 1)).toEqual({
      name: "1867 Preface to the First German Edition",
      short: "Preface (1867)",
    });
  });

  it("falls back to the document title and its position", () => {
    expect(chapterName(doc([{ text: "A spectre is haunting Europe" }]), 2)).toEqual({
      name: "Communist Manifesto (Chapter 3)",
      short: "Ch. 2",
    });
  });

  it("names the Communist Manifesto historical prefaces collection cleanly", () => {
    const d = doc([{ type: "heading", text: "Preface" }], {
      id: "document:marx:1848:communist-manifesto:preface",
    });
    expect(chapterName(d, 0)).toEqual({
      name: "Prefaces to Various Editions (1872–1893)",
      short: "Prefaces",
    });
  });

  it("names the 1857 Introduction cleanly", () => {
    const d = doc([{ type: "heading", text: "Introduction to a Contribution..." }], {
      id: "document:marx:1859:critique-of-political-economy:intro",
    });
    expect(chapterName(d, 1)).toEqual({
      name: "Introduction to the Critique of Political Economy (1857)",
      short: "1857 Intro",
    });
  });

  it("filters Part headings and redundant Preface labels out of chapter sections", () => {
    const d = doc([
      { type: "heading", text: "Part I: Commodities and Money" },
      { type: "heading", text: "Chapter One: Commodities" },
      { type: "heading", text: "SECTION 1" },
      { type: "heading", text: "THE TWO FACTORS OF A COMMODITY" },
    ]);
    const name = { name: "Chapter One: Commodities", short: "Ch. 1" };
    expect(sections(d, name).map((s) => s.title)).toEqual([
      "SECTION 1",
      "THE TWO FACTORS OF A COMMODITY",
    ]);
  });
});

describe("groupByParts", () => {
  it("groups chapters into parts in order", () => {
    const mockChapters = [
      {
        path: "/ch01",
        name: { name: "Ch 1", short: "Ch. 1" },
        numeral: "1",
        passages: 10,
        words: 100,
        sections: [],
        opening: "...",
        part: "Part I",
      },
      {
        path: "/ch02",
        name: { name: "Ch 2", short: "Ch. 2" },
        numeral: "2",
        passages: 10,
        words: 100,
        sections: [],
        opening: "...",
        part: "Part I",
      },
      {
        path: "/ch04",
        name: { name: "Ch 4", short: "Ch. 4" },
        numeral: "4",
        passages: 10,
        words: 100,
        sections: [],
        opening: "...",
        part: "Part II",
      },
    ];
    const groups = groupByParts(mockChapters);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.title).toBe("Part I");
    expect(groups[0]?.chapters).toHaveLength(2);
    expect(groups[1]?.title).toBe("Part II");
    expect(groups[1]?.chapters).toHaveLength(1);
  });
});

describe("openingLine and minutes", () => {
  it("quotes the first running text, cut at a word", () => {
    const d = doc([{ type: "heading", text: "Chapter II." }, { text: "word ".repeat(60) }]);
    const line = openingLine(d, "en-plain", 30);
    expect(line.endsWith(" …")).toBe(true);
    expect(line.length).toBeLessThanOrEqual(32);
  });

  it("never shows less than a minute", () => {
    expect(minutes(10)).toBe(1);
    expect(minutes(5000)).toBe(25);
  });
});
