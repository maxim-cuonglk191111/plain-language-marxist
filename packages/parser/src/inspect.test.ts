import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inspectDocument } from "./inspect.ts";
import { MiaAdapter } from "./mia/adapter.ts";
import type { NormalizedDocument } from "./types.ts";

const dir = new URL("../fixtures/mia/", import.meta.url);
const doc = (blocks: NormalizedDocument["blocks"]): NormalizedDocument => ({
  title: "t",
  blocks,
  metadata: {},
  warnings: [],
});

describe("inspectDocument", () => {
  it.each(readdirSync(dir).filter((f) => f.endsWith(".html")))("%s has no errors", (file) => {
    const parsed = MiaAdapter.parse({
      url: "https://www.marxists.org/x.htm",
      retrievedAt: "x",
      bytes: readFileSync(new URL(file, dir)),
    });
    expect(inspectDocument(parsed).filter((f) => f.level === "error")).toEqual([]);
  });

  it("flags the classic failure modes", () => {
    const findings = inspectDocument(
      doc([
        { type: "heading", level: 1, text: "Title" },
        { type: "paragraph", text: 'Text<fn ref="9"/> &lt;div class="x"&gt; leftover' },
        { type: "paragraph", text: "Next: Chapter 2" },
        { type: "paragraph", text: "Transcribed: by someone; HTML markup: by another" },
        { type: "paragraph", text: "Same" },
        { type: "paragraph", text: "Same" },
        { type: "paragraph", text: "— • —" },
        { type: "blockquote", text: "[...]" },
        { type: "footnote", label: "8", text: "" },
        { type: "paragraph", text: "x".repeat(6001) },
      ]),
    ).map((f) => `${f.level} ${f.code}`);
    expect(findings).toEqual(
      expect.arrayContaining([
        "error footnote-ref",
        "warning escaped-markup",
        "warning navigation",
        "warning metadata",
        "warning duplicate",
        "warning no-letters",
        "error empty",
        "warning long-block",
      ]),
    );
  });

  it("does not flag prose that merely mentions publication", () => {
    const findings = inspectDocument(
      doc([{ type: "paragraph", text: "The Manifesto was first published in London in 1848." }]),
    );
    expect(findings.map((f) => f.code)).not.toContain("metadata");
  });

  it("errors on MIA's 404 page and Wayback's own pages", () => {
    for (const title of ["Object not found!", "Wayback Machine"]) {
      const d = { ...doc([{ type: "paragraph", text: "Some text" }]), title };
      expect(inspectDocument(d).map((f) => f.code)).toContain("error-page");
    }
  });

  it("errors when no body text was found", () => {
    expect(
      inspectDocument(doc([{ type: "heading", level: 1, text: "Only a title" }])).map(
        (f) => f.code,
      ),
    ).toContain("no-text");
  });
});
