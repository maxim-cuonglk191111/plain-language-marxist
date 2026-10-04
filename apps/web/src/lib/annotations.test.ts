import { describe, expect, it } from "vitest";
import {
  bookmarkId,
  mergeAnnotations,
  migrateAnnotations,
  toMarkdown,
  type Annotation,
} from "./annotations";
import { withSource, type CitationMeta } from "./citation";

const CH1 = "/archive/marx/works/1848/communist-manifesto/ch01.htm";

const mark = (over: Partial<Annotation> = {}): Annotation => ({
  id: "a1",
  kind: "mark",
  scope: "text",
  path: CH1,
  title: "Chapter I. Bourgeois and Proletarians",
  work: "Manifesto of the Communist Party",
  passage: "p00009",
  layer: "plain",
  quote: { exact: "class struggles", prefix: "the history of ", suffix: ".", start: 40 },
  color: "yellow",
  snippet: "class struggles",
  created: 1,
  updated: 1,
  ...over,
});

describe("migrateAnnotations", () => {
  it("starts empty from nothing or garbage", () => {
    expect(migrateAnnotations(null)).toEqual({ v: 1, items: [] });
    expect(migrateAnnotations({ v: 1, items: "x" })).toEqual({ v: 1, items: [] });
  });

  it("folds in pre-031 bookmarks once, without loss", () => {
    const legacy = [
      { path: CH1, title: "Manifesto: Ch. 1", passage: "p00009", snippet: "The history" },
    ];
    const once = migrateAnnotations(null, legacy);
    expect(once.items).toEqual([
      expect.objectContaining({
        id: bookmarkId(CH1, "p00009"),
        kind: "bookmark",
        passage: "p00009",
        title: "Manifesto: Ch. 1",
        snippet: "The history",
      }),
    ]);
    // Read again with the old list still present: no duplicate.
    expect(migrateAnnotations(once, legacy).items).toHaveLength(1);
  });

  it("drops broken items but keeps valid ones, and repairs what it can", () => {
    const h = migrateAnnotations({
      v: 1,
      items: [
        mark(),
        { id: "x" }, // no path
        { ...mark({ id: "empty" }), color: undefined }, // carries nothing
        { ...mark({ id: "noquote" }), quote: { exact: "" } }, // becomes a passage mark
      ],
    });
    expect(h.items.map((a) => [a.id, a.scope])).toEqual([
      ["a1", "text"],
      ["noquote", "passage"],
    ]);
  });
});

describe("mergeAnnotations (import)", () => {
  it("adds new items and keeps the newer copy of the same id", () => {
    const mine = { v: 1 as const, items: [mark({ updated: 5, color: "green" })] };
    const theirs = {
      v: 1 as const,
      items: [mark({ updated: 9, color: "pink" }), mark({ id: "b2" })],
    };
    const { store, added, updated } = mergeAnnotations(mine, theirs);
    expect([added, updated]).toEqual([1, 1]);
    expect(store.items.find((a) => a.id === "a1")?.color).toBe("pink");
    const older = mergeAnnotations(store, mine);
    expect(older.updated).toBe(0);
  });
});

describe("toMarkdown", () => {
  it("groups by work and chapter, links each item and labels Plain English quotes", () => {
    const md = toMarkdown([mark({ note: "Key sentence." })], "https://plm.example");
    expect(md).toContain("## Manifesto of the Communist Party");
    expect(md).toContain("### Chapter I. Bourgeois and Proletarians");
    expect(md).toContain(`https://plm.example${CH1}#p00009`);
    expect(md).toContain("> class struggles");
    expect(md).toContain("not the original wording");
    expect(md).toContain("Key sentence.");
  });
});

describe("withSource", () => {
  const meta: CitationMeta = {
    authors: "Marx & Engels",
    work: "Manifesto of the Communist Party",
    year: 1848,
    translator: "Samuel Moore",
    translationYear: 1888,
    numeral: "I",
  };
  const url = `https://plm.example${CH1}#p00009`;

  it("credits the translator for the Original", () => {
    expect(
      withSource(
        "The history of all hitherto existing society is the history of class struggles.",
        meta,
        "original",
        url,
        ["p00009"],
      ),
    ).toBe(
      `“The history of all hitherto existing society is the history of class struggles.”\n— Marx & Engels, Manifesto of the Communist Party (1848), I.9, trans. Samuel Moore (1888). Original text. ${url}`,
    );
  });

  it("says a Plain English quote is our version, not the original wording", () => {
    const text = withSource(" The history of all society up to now ", meta, "plain", url, [
      "p00009",
    ]);
    expect(text).toMatch(
      /^“The history of all society up to now”\n— Plain English version by Plain Language Marxist, not the original wording\. Based on Marx & Engels/,
    );
    expect(text).not.toContain("trans.");
  });
});
