import type { DataDocument } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { chapterName, countWords, minutes, openingLine, plainOf, sections } from "./reading";

const doc = (passages: Partial<DataDocument["passages"][number]>[]): DataDocument => ({
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

  it("falls back to the document title and its position", () => {
    expect(chapterName(doc([{ text: "A spectre is haunting Europe" }]), 2)).toEqual({
      name: "Communist Manifesto (Chapter 3)",
      short: "Ch. 2",
    });
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
