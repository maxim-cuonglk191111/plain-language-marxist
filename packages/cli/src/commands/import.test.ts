import { cpSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "@plm/content";
import { FetchRefused } from "@plm/parser";
import { describe, expect, it } from "vitest";
import { deriveLocation, runImport, type Fetcher } from "./import.ts";

const repoRoot = new URL("../../../../", import.meta.url);
const MANIFESTO = "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm";
const SNAPSHOT = `https://web.archive.org/web/20251231110124id_/${MANIFESTO}`;
const fixture = readFileSync(new URL("packages/parser/fixtures/mia/manifesto-ch01.html", repoRoot));

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "plm-import-"));
  cpSync(new URL("config/sources.yml", repoRoot), join(root, "config/sources.yml"));
  return root;
}

const quiet = () => {};
const written = <T>(result: T | null): T => {
  if (!result) throw new Error("import wrote nothing");
  return result;
};
const direct: Fetcher = async (url) => ({ url, body: fixture });

describe("deriveLocation", () => {
  it("derives author/year/slug/doc from MIA work URLs", () => {
    expect(deriveLocation(new URL(MANIFESTO))).toEqual({
      author: "marx",
      year: "1848",
      slug: "communist-manifesto",
      doc: "ch01",
    });
    expect(
      deriveLocation(new URL("https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm")),
    ).toBeNull();
  });
});

describe("plm import", () => {
  it("writes source.yml, snapshot and work stub; only the rights check then fails", async () => {
    const root = tempRepo();
    const result = await runImport(
      { url: MANIFESTO, root, yes: true, today: "2026-10-03" },
      direct,
      quiet,
    );
    expect(result?.sourceFile).toBe("content/works/marx/1848/communist-manifesto/ch01/source.yml");
    expect(result?.summary.added).toBeGreaterThan(50);
    expect(readFileSync(join(root, written(result).snapshotFile))).toEqual(fixture);

    const issues = validate(root);
    expect(issues.map((i) => `${i.severity} ${i.code}`)).toEqual(["error rights/unverified"]);

    const source = readFileSync(join(root, written(result).sourceFile), "utf8");
    expect(source).toContain("provider: mia");
    expect(source).toContain("- id: p00001");
    expect(source).not.toContain("via:");
  });

  it("re-importing an unchanged source keeps every passage and rewrites nothing", async () => {
    const root = tempRepo();
    const first = await runImport(
      { url: MANIFESTO, root, yes: true, today: "2026-10-03" },
      direct,
      quiet,
    );
    const before = readFileSync(join(root, written(first).sourceFile), "utf8");
    const again = await runImport(
      { url: MANIFESTO, root, yes: true, today: "2026-10-03" },
      direct,
      quiet,
    );
    expect(again?.summary).toMatchObject({ added: 0, tombstoned: 0, layoutChanged: 0 });
    expect(readFileSync(join(root, written(again).sourceFile), "utf8")).toBe(before);
    expect(again?.snapshotFile).toBe(first?.snapshotFile);
  });

  it("falls back to a Wayback raw snapshot on network errors and records it", async () => {
    const root = tempRepo();
    const calls: string[] = [];
    const flaky: Fetcher = async (url) => {
      calls.push(url);
      if (url.startsWith("https://www.marxists.org/")) throw new Error("connect ECONNREFUSED");
      return { url: SNAPSHOT, body: fixture };
    };
    const result = await runImport(
      { url: MANIFESTO, root, yes: true, today: "2026-10-03" },
      flaky,
      quiet,
    );
    expect(calls[1]).toMatch(
      /^https:\/\/web\.archive\.org\/web\/\d{8}id_\/https:\/\/www\.marxists\.org\//,
    );
    if (!result) throw new Error("import wrote nothing");
    expect(readFileSync(join(root, result.sourceFile), "utf8")).toContain(`via: ${SNAPSHOT}`);
  });

  it("never falls back when the fetch was refused", async () => {
    const root = tempRepo();
    const refused: Fetcher = async () => {
      throw new FetchRefused("resolves to a non-public address");
    };
    await expect(runImport({ url: MANIFESTO, root, yes: true }, refused, quiet)).rejects.toThrow(
      "non-public",
    );
  });

  it("refuses a Wayback response that is not a raw snapshot of the page", async () => {
    const root = tempRepo();
    const wrong: Fetcher = async () => ({
      url: "https://web.archive.org/web/20251231110124/https://www.marxists.org/other.htm",
      body: fixture,
    });
    await expect(
      runImport({ url: MANIFESTO, root, yes: true, via: "wayback" }, wrong, quiet),
    ).rejects.toThrow("not a raw snapshot");
  });

  it("refuses hosts that are not in config/sources.yml", async () => {
    await expect(
      runImport({ url: "https://example.org/a.htm", root: tempRepo(), yes: true }, direct, quiet),
    ).rejects.toThrow("not in config/sources.yml");
  });

  it("asks for --work and --doc when the URL does not say", async () => {
    await expect(
      runImport(
        {
          url: "https://www.marxists.org/archive/marx/works/1867-c1/ch01.htm",
          root: tempRepo(),
          yes: true,
        },
        direct,
        quiet,
      ),
    ).rejects.toThrow("--work author/year/slug");
  });
});
