import { mkdtempSync, readFileSync, readdirSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { DataDocument, DataIndex, DataManifest, DataSearch, DataTerm } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { buildData, documentDataPath } from "./build.ts";
import { fileHash } from "./hash.ts";
import { DOC_PUBLIC_PATH, PATHS, writeFixture } from "./test-fixture.ts";

const OPTIONS = { release: "2026.10.03-abc1234", contentCommit: "abc1234" };

function build(root: string) {
  const out = mkdtempSync(join(tmpdir(), "plm-build-"));
  const result = buildData({ root, out, ...OPTIONS });
  return { out, result, read: (p: string) => JSON.parse(readFileSync(join(out, "data/v1", p), "utf8")) };
}

function allFiles(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string) => {
    for (const e of readdirSync(d)) {
      const full = join(d, e);
      if (statSync(full).isDirectory()) walk(full);
      else out.set(relative(dir, full), readFileSync(full, "utf8"));
    }
  };
  walk(dir);
  return out;
}

describe("plm build", () => {
  it("writes index, documents, terms and manifest that match the v1 contract", () => {
    const { result, read } = build(writeFixture());
    expect(result.ok).toBe(true);
    const index = DataIndex.parse(read("index.json"));
    expect(index.works[0]?.documents[0]?.path).toBe(DOC_PUBLIC_PATH);
    expect(index.works[0]?.documents[0]?.covered).toEqual({ "en-plain": 4 });

    const doc = DataDocument.parse(read(documentDataPath(`https://www.marxists.org${DOC_PUBLIC_PATH}`)));
    expect(doc.passages.map((p) => p.id)).toEqual(["p00001", "p00002", "p00003", "p00005", "p00006"]); // tombstone omitted
    const first = doc.renderings["en-plain"]?.[0];
    expect(first?.text_raw).toBe("I. The {Bourgeoisie} and the Working Class");
    expect(first?.text).toBe("I. The Capitalist class and the Working Class");
    expect(first?.stale).toBe(false);
    expect(doc.passages.find((p) => p.id === "p00005")?.annotations).toEqual([
      { term: "bourgeoisie", match: "bourgeois", occurrence: 1 },
    ]);

    const term = DataTerm.parse(read("terms/bourgeoisie.json"));
    expect(term.renderings.find((r) => r.key === "capitalist-class")?.usage).toBe(1);

    const search = DataSearch.parse(read("search.json"));
    expect(new Set(search.entries.map((e) => e.l))).toEqual(new Set(["o", "p", "e", "v"]));
    expect(search.entries).toContainEqual({ d: 0, p: "p00001", l: "p", t: "I. The Capitalist class and the Working Class" });

    const manifest = DataManifest.parse(read("manifest.json"));
    expect(manifest.counts).toEqual({ works: 1, documents: 1, passages: 5, renderings: 3, terms: 1 });
    expect(Object.keys(manifest.files)).toContain("index.json");
  });

  it("records file checksums that match the files", () => {
    const { out, read } = build(writeFixture());
    const manifest = DataManifest.parse(read("manifest.json"));
    for (const [path, hash] of Object.entries(manifest.files)) {
      expect(fileHash(readFileSync(join(out, "data/v1", path), "utf8"))).toBe(hash);
    }
  });

  it("is deterministic: the same input builds byte-identical output", () => {
    const root = writeFixture();
    const a = allFiles(join(build(root).out, "data/v1"));
    const b = allFiles(join(build(root).out, "data/v1"));
    expect([...a.keys()].sort()).toEqual([...b.keys()].sort());
    for (const [path, content] of a) expect(b.get(path)).toBe(content);
  });

  it("marks stale renderings", () => {
    const { result, read } = build(
      writeFixture((d) => (d[PATHS.rendering].renderings.p00001.based_on = `sha256:${"0".repeat(64)}`)),
    );
    expect(result.ok).toBe(true);
    const doc = DataDocument.parse(read(documentDataPath(`https://www.marxists.org${DOC_PUBLIC_PATH}`)));
    expect(doc.renderings["en-plain"]?.[0]?.stale).toBe(true);
  });

  it("refuses to build when validation fails", () => {
    const { result } = build(writeFixture((d) => (d[PATHS.rendering].renderings.p00005.covers = ["p00005", "p00099"])));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.some((i) => i.code === "rendering/unknown-passage")).toBe(true);
  });

  it("leaves blocked works out", () => {
    const { result, read } = build(writeFixture((d) => (d[PATHS.work].rights.status = "BLOCKED")));
    expect(result.ok).toBe(true);
    expect(DataIndex.parse(read("index.json")).works).toEqual([]);
  });
});
