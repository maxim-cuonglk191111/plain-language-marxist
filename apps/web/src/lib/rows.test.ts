import type { DataDocument } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { buildRows, footnoteTargets } from "./rows";

const passage = (id: string, type = "paragraph", label?: string) => ({
  id,
  type,
  text: id,
  annotations: [],
  ...(label ? { label } : {}),
});
const rendering = (covers: string[]) => ({
  covers,
  revision: 1,
  ai_assisted: false,
  stale: false,
  text_raw: "x",
  text: "x",
});

const doc: DataDocument = {
  version: 1,
  id: "document:a:1848:b:c",
  work_id: "work:a:1848:b",
  title: "T",
  path: "/archive/a.htm",
  source: {
    provider: "mia",
    url: "https://www.marxists.org/archive/a.htm",
    retrieved_at: "2026-10-03",
    attribution: "MIA",
  },
  passages: [
    passage("p00001"),
    passage("p00002"),
    passage("p00003"),
    passage("p00004"),
    passage("p00005", "footnote", "1"),
  ],
  renderings: { "en-plain": [rendering(["p00002", "p00003"]), rendering(["p00005"])] },
  explanations: [],
};

describe("buildRows", () => {
  it("groups passages covered by one rendering into a single aligned row", () => {
    expect(
      buildRows(doc, "en-plain").map((r) => [
        r.ids.join("+"),
        r.rendering ? "rendered" : "missing",
      ]),
    ).toEqual([
      ["p00001", "missing"],
      ["p00002+p00003", "rendered"],
      ["p00004", "missing"],
      ["p00005", "rendered"],
    ]);
  });

  it("treats every passage as missing when there is no rendering file", () => {
    expect(buildRows(doc, "vi-plain").every((r) => r.rendering === null)).toBe(true);
  });

  it("maps footnote labels to passage ids", () => {
    expect(Object.fromEntries(footnoteTargets(doc))).toEqual({ "1": "p00005" });
  });
});
