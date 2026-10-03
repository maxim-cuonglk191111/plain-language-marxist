import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { parseLayout } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { MiaAdapter } from "./adapter.ts";

// Golden files: fixtures/mia/<name>.golden.json. After an intended parser change,
// regenerate with UPDATE_GOLDEN=1 pnpm test, review the diff, and bump MiaAdapter.version.
const dir = new URL("../../fixtures/mia/", import.meta.url);
const fixtures = readdirSync(dir).filter((f) => f.endsWith(".html"));
const provenance = JSON.parse(readFileSync(new URL("provenance.json", dir), "utf8")) as {
  fixtures: Record<string, { url: string }>;
};

function parseFixture(file: string) {
  const url = provenance.fixtures[file]?.url ?? "https://www.marxists.org/";
  return MiaAdapter.parse({
    url,
    retrievedAt: "2026-10-03",
    bytes: readFileSync(new URL(file, dir)),
  });
}

describe("MIA adapter golden files", () => {
  it.each(fixtures)("%s matches its golden output", (file) => {
    const actual = `${JSON.stringify(parseFixture(file), null, 2)}\n`;
    const golden = new URL(file.replace(/\.html$/, ".golden.json"), dir);
    if (process.env.UPDATE_GOLDEN) writeFileSync(golden, actual);
    expect(actual).toBe(readFileSync(golden, "utf8"));
  });
});

describe("MIA adapter invariants", () => {
  it.each(fixtures)(
    "%s: valid markup, resolved notes, no source anchors, deterministic",
    (file) => {
      const doc = parseFixture(file);
      expect(doc.blocks.length).toBeGreaterThan(0);
      for (const block of doc.blocks) {
        expect(parseLayout(block.text).ok, block.text.slice(0, 80)).toBe(true);
        expect(block.text).not.toMatch(/<a |name=|class=/);
      }
      const labels = new Set(doc.blocks.filter((b) => b.type === "footnote").map((b) => b.label));
      const refs = new Set(
        [
          ...doc.blocks
            .map((b) => b.text)
            .join(" ")
            .matchAll(/<fn ref="([^"]+)"\/>/g),
        ].map((m) => m[1]),
      );
      expect([...refs].filter((r) => !labels.has(r))).toEqual([]);
      expect([...labels].filter((l) => !refs.has(l))).toEqual([]);
      expect(parseFixture(file)).toEqual(doc);
    },
  );

  it("keeps the Manifesto's text, notes and layout", () => {
    const doc = parseFixture("manifesto-ch01.html");
    const texts = doc.blocks.map((b) => b.text);
    expect(texts).toContain(
      'The history of all hitherto existing society<fn ref="2"/> is the history of class struggles.',
    );
    expect(doc.blocks.find((b) => b.type === "heading" && b.level === 3)?.text).toBe(
      'Chapter I. Bourgeois and Proletarians<fn ref="1"/>',
    );
    expect(
      texts.some((t) => t.startsWith('<indent level="1"/>I. Communism is already acknowledged')),
    ).toBe(true);
    expect(texts.some((t) => t.includes("[<i>lumpenproletariat</i>]"))).toBe(true);
    const note2 = doc.blocks.find((b) => b.type === "footnote" && b.label === "2");
    expect(note2?.text.startsWith("That is, all <i>written</i> history.")).toBe(true);
    expect(texts.some((t) => /Chapter 2|Table of Contents|German Original/.test(t))).toBe(false);
  });

  it("drops editorial notes but keeps author notes (Civil War in France)", () => {
    const doc = parseFixture("civil-war-ch05.html");
    expect(doc.blocks.filter((b) => b.type === "footnote").map((b) => b.label)).toEqual(["1", "2"]);
    expect(doc.blocks.some((b) => b.text.includes("top-down system of appointing officials"))).toBe(
      false,
    );
    expect(doc.warnings).toContain("dropped 30 editorial note(s) and their references");
  });

  it("keeps statistics tables with spans and decodes ISO-8859-1 (Capital ch. 25)", () => {
    const doc = parseFixture("capital-ch25.html");
    const tables = doc.blocks.filter((b) => b.type === "table");
    expect(tables.length).toBeGreaterThan(10);
    expect(tables.some((t) => t.text.includes('colspan="2"'))).toBe(true);
    expect(doc.blocks.some((b) => b.type === "caption" && b.text.includes("<i>Table C</i>"))).toBe(
      true,
    );
    expect(doc.blocks.some((b) => b.text.includes("£"))).toBe(true);
  });

  it("drops chrome: tables of contents, metadata and separators become structure (Inaugural, Capital)", () => {
    const inaugural = parseFixture("inaugural.html");
    expect(inaugural.blocks.filter((b) => b.type === "separator").map((b) => b.text)).toEqual([
      "* * *",
      "* * *",
    ]);
    expect(Object.keys(inaugural.metadata)).toContain("Written");
    const capital = parseFixture("capital-ch01.html");
    expect(capital.blocks.some((b) => b.text.startsWith("Section 1 - The Two Factors"))).toBe(
      false,
    );
    expect(capital.warnings).toContain("dropped table-of-contents block(s)");
  });

  it("keeps verse line breaks (Internationale)", () => {
    const doc = parseFixture("internationale.html");
    expect(
      doc.blocks.some((b) =>
        b.text.startsWith(
          "Arise ye workers from your slumbers<br/>Arise ye prisoners of want<br/>",
        ),
      ),
    ).toBe(true);
  });
});
