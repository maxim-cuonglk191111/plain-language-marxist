import { describe, expect, it } from "vitest";
import { migrateHistory } from "./history";

const CH2 = "/archive/marx/works/1848/communist-manifesto/ch02.htm";

describe("migrateHistory", () => {
  it("starts empty from nothing or garbage", () => {
    expect(migrateHistory(null)).toEqual({ v: 1, docs: {} });
    expect(migrateHistory("oops")).toEqual({ v: 1, docs: {} });
    expect(migrateHistory({ v: 1, docs: { [CH2]: 7 } })).toEqual({ v: 1, docs: {} });
  });

  it("brings in the pre-031 plm:progress:<path> passages", () => {
    const h = migrateHistory(null, { [CH2]: "p00017" });
    expect(h.docs[CH2]).toEqual({
      title: "ch02.htm",
      work: "",
      workPath: "/archive/marx/works/1848/communist-manifesto/",
      passage: "p00017",
      percent: 0,
      updated: 0,
      finished: false,
    });
  });

  it("keeps a newer entry over the legacy one", () => {
    const stored = { v: 1, docs: { [CH2]: { passage: "p00040", percent: 55, updated: 5 } } };
    const h = migrateHistory(stored, { [CH2]: "p00017" });
    expect(h.docs[CH2]?.passage).toBe("p00040");
    expect(h.docs[CH2]?.percent).toBe(55);
  });

  it("fills missing fields with defaults and clamps the percent", () => {
    const h = migrateHistory({ v: 1, docs: { [CH2]: { percent: 140, finished: "yes" } } });
    expect(h.docs[CH2]).toMatchObject({ percent: 100, finished: false, passage: "", updated: 0 });
  });
});
