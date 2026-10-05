import {
  CollectionsEntry,
  ExplanationsFile,
  OriginalTermsFile,
  RenderingFile,
  SourceFile,
  TermFile,
  WorkFile,
} from "@plm/schema";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { PATHS, fixtureData } from "./test-fixture.ts";
import { parseContent, stringifyContent } from "./yaml.ts";

const data = fixtureData();
const FILES = [
  ["work", WorkFile, data[PATHS.work]],
  ["source", SourceFile, data[PATHS.source]],
  ["rendering", RenderingFile, data[PATHS.rendering]],
  ["original-terms", OriginalTermsFile, data[PATHS.terms]],
  ["explanations", ExplanationsFile, data[PATHS.explanations]],
  ["term", TermFile, data[PATHS.term]],
  ["collection", CollectionsEntry, data[PATHS.collection]],
] as const;

describe("stringifyContent", () => {
  it.each(FILES)("%s: load → write reproduces the file byte for byte", (_, schema, value) => {
    const written = stringifyContent(schema, value);
    expect(stringifyContent(schema, parseYaml(written))).toBe(written);
  });

  it("orders keys by the schema, whatever the input order", () => {
    const shuffled = Object.fromEntries(Object.entries(data[PATHS.work]).reverse());
    const written = stringifyContent(WorkFile, shuffled);
    expect(written.startsWith("schema_version: 4\nid: work:marx:1848:communist-manifesto\n")).toBe(
      true,
    );
    expect(written).toBe(stringifyContent(WorkFile, data[PATHS.work]));
  });

  it("writes short id lists inline and multi-line text as a literal block", () => {
    const written = stringifyContent(RenderingFile, data[PATHS.rendering]);
    expect(written).toContain("covers: [p00002, p00003]");
    expect(written).toContain("text: |\n      All history up to now");
  });

  it("never folds long lines", () => {
    const long = { ...data[PATHS.term], definition: { short: "word ".repeat(60).trim() } };
    const written = stringifyContent(TermFile, long);
    expect(written).toContain(`short: ${"word ".repeat(60).trim()}\n`);
  });

  it("refuses to write invalid data", () => {
    expect(() => stringifyContent(WorkFile, { ...data[PATHS.work], id: "bad" })).toThrow();
  });
});

describe("parseContent", () => {
  it("returns data and a line lookup for valid files", () => {
    const result = parseContent(stringifyContent(WorkFile, data[PATHS.work]), WorkFile);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.lineOf(["documents"])).toBeGreaterThan(1);
  });
});
