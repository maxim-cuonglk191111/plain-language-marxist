import { describe, expect, it } from "vitest";
import { mergePassages, type IncomingBlock } from "./merge.ts";

const p = (text: string): IncomingBlock => ({ type: "paragraph", text });
const ids = (r: ReturnType<typeof mergePassages>) =>
  r.passages.map((x) => `${x.id}${x.state === "tombstoned" ? "†" : ""}${x.derived_from ? `<${x.derived_from.join(",")}` : ""}`);

describe("mergePassages", () => {
  const first = mergePassages(undefined, [p("one"), p("two"), p("three")]);

  it("numbers a first import sequentially", () => {
    expect(ids(first)).toEqual(["p00001", "p00002", "p00003"]);
    expect(first.summary).toEqual({ kept: 0, added: 3, tombstoned: 0, layoutChanged: 0 });
  });

  it("keeps every id when nothing changed", () => {
    const again = mergePassages(first.passages, [p("one"), p("two"), p("three")]);
    expect(again.passages).toEqual(first.passages);
    expect(again.summary).toEqual({ kept: 3, added: 0, tombstoned: 0, layoutChanged: 0 });
  });

  it("gives an inserted block the next free id, not a position", () => {
    const r = mergePassages(first.passages, [p("one"), p("new"), p("two"), p("three")]);
    expect(ids(r)).toEqual(["p00001", "p00004", "p00002", "p00003"]);
  });

  it("tombstones removed passages instead of deleting them", () => {
    const r = mergePassages(first.passages, [p("one"), p("three")]);
    expect(ids(r)).toEqual(["p00001", "p00002†", "p00003"]);
    expect(r.summary.tombstoned).toBe(1);
  });

  it("links a changed paragraph to the one it replaced", () => {
    const r = mergePassages(first.passages, [p("one"), p("two, corrected"), p("three")]);
    expect(ids(r)).toEqual(["p00001", "p00002†", "p00004<p00002", "p00003"]);
  });

  it("keeps the id when only layout changed, and takes the new markup", () => {
    const r = mergePassages(first.passages, [p("one"), p("<i>two</i>"), p("three")]);
    expect(ids(r)).toEqual(["p00001", "p00002", "p00003"]);
    expect(r.passages[1]?.text).toBe("<i>two</i>");
    expect(r.summary.layoutChanged).toBe(1);
  });

  it("keeps old tombstones in place and never reuses their ids", () => {
    const withTombstone = mergePassages(first.passages, [p("one"), p("three")]).passages;
    const r = mergePassages(withTombstone, [p("one"), p("three"), p("four")]);
    expect(ids(r)).toEqual(["p00001", "p00002†", "p00003", "p00004"]);
  });
});
