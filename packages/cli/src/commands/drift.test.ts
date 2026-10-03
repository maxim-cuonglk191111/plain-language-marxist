import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { driftReport, runDiffSource } from "./drift.ts";
import { checkLinks } from "./links.ts";
import { runImport, type Fetcher } from "./import.ts";

const repoRoot = new URL("../../../../", import.meta.url);
const MANIFESTO = "https://www.marxists.org/archive/marx/works/1848/communist-manifesto/ch01.htm";
const html = readFileSync(
  new URL("packages/parser/fixtures/mia/manifesto-ch01.html", repoRoot),
  "latin1",
);
const serve =
  (page: string): Fetcher =>
  async (url) => ({ url, body: Buffer.from(page, "latin1") });

async function importedRepo(): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), "plm-drift-"));
  cpSync(new URL("config/sources.yml", repoRoot), join(root, "config/sources.yml"));
  await runImport({ url: MANIFESTO, root, yes: true, today: "2026-10-03" }, serve(html), () => {});
  return root;
}

describe("plm diff-source", () => {
  it("reports UNCHANGED when the page is byte-identical", async () => {
    const [r] = await runDiffSource({ root: await importedRepo() }, serve(html));
    expect(r?.status).toBe("UNCHANGED");
  });

  it("reports FORMATTING_CHANGED when only markup changed", async () => {
    const restyled = html
      .replace("<p>\nThe history of all", '<p class="fst">\nThe history of all')
      .replace(/&#160;/g, " ");
    const [r] = await runDiffSource(
      { root: await importedRepo() },
      serve(restyled.replace("</title>", " </title>")),
    );
    expect(r?.status).toBe("FORMATTING_CHANGED");
  });

  it("reports TEXT_CHANGED with the changed passage", async () => {
    const edited = html.replace(
      "is the history of class struggles.",
      "is the history of class conflicts.",
    );
    const [r] = await runDiffSource({ root: await importedRepo() }, serve(edited));
    expect(r?.status).toBe("TEXT_CHANGED");
    expect(r?.changes.join("\n")).toContain("class conflicts");
    expect(driftReport([r!])).toContain("| TEXT_CHANGED |"); // eslint-disable-line @typescript-eslint/no-non-null-assertion
  });

  it("reports STRUCTURE_CHANGED when a paragraph disappears", async () => {
    const shorter = html.replace(/<p>\s*Two things result from this fact:[\s\S]*?<\/p>/, "");
    const [r] = await runDiffSource({ root: await importedRepo() }, serve(shorter));
    expect(r?.status).toBe("STRUCTURE_CHANGED");
  });

  it("reports UNAVAILABLE when the source cannot be fetched", async () => {
    const down: Fetcher = async () => {
      throw new Error("HTTP 503");
    };
    const [r] = await runDiffSource({ root: await importedRepo(), via: "wayback" }, down);
    expect(r?.status).toBe("UNAVAILABLE");
  });
});

describe("plm check-links", () => {
  function site(files: Record<string, string>): string {
    const root = mkdtempSync(join(tmpdir(), "plm-site-"));
    for (const [path, content] of Object.entries(files)) {
      mkdirSync(join(root, path, ".."), { recursive: true });
      writeFileSync(join(root, path), content);
    }
    return root;
  }

  it("finds broken pages, broken fragments and insecure links, and checks external links", async () => {
    const root = site({
      "index.html":
        '<a href="/doc.htm#p00001">ok</a> <a href="/vocabulary/x/">ok</a> <a href="/missing/">bad</a> <a href="/doc.htm#p09999">bad</a> <a href="http://example.org/">bad</a> <a href="https://www.marxists.org/gone.htm">ext</a>',
      "doc.htm": '<section id="p00001"></section>',
      "vocabulary/x/index.html": "<h1>x</h1>",
    });
    const fetcher: Fetcher = async (url) => {
      if (url.includes("gone")) throw new Error("HTTP 404 from " + url);
      return { url, body: new Uint8Array() };
    };
    const result = await checkLinks({ site: root, external: true }, fetcher);
    expect(result.broken.map((b) => `${b.href} — ${b.reason}`)).toEqual([
      "/missing/ — no such page",
      '/doc.htm#p09999 — no element with id "p09999"',
      "http://example.org/ — insecure http:// link",
      "https://www.marxists.org/gone.htm — HTTP 404 from https://www.marxists.org/gone.htm",
    ]);
  });
});
