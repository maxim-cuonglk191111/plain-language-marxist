import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validate } from "@plm/content";
import { describe, expect, it } from "vitest";
import { runApply, runPrompt } from "./draft.ts";

const repoRoot = new URL("../../../../", import.meta.url);
const DOC = "content/works/marx/1848/communist-manifesto/ch01";

/** A copy of the real Ch. I content and editorial docs, with no renderings yet. */
function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), "plm-draft-"));
  for (const dir of ["content", "docs/editorial"])
    cpSync(new URL(dir, repoRoot), join(root, dir), { recursive: true });
  rmSync(join(root, DOC, "en-plain.yml"), { force: true });
  return root;
}

function apply(root: string, input: string, aiAssisted = false) {
  const lines: string[] = [];
  const code = runApply(join(root, DOC), input, {
    root,
    language: "en",
    register: "plain",
    aiAssisted,
    log: (l) => lines.push(l),
  });
  return { code, output: lines.join("\n") };
}

const renderingFile = (root: string) => join(root, DOC, "en-plain.yml");

describe("plm prompt", () => {
  it("prints the next untranslated passages with rules, term tokens and exchange headers", () => {
    const root = tempRepo();
    const prompt = runPrompt(join(root, DOC), {
      root,
      language: "en",
      register: "plain",
      next: 10,
    });
    expect(prompt.match(/^=== p\d{5}$/gm)).toHaveLength(10);
    expect(prompt).toContain("=== p00001\nManifesto of the Communist Party");
    expect(prompt).toContain("1. Modernize vocabulary and syntax.");
    expect(prompt).toContain(
      "Manifesto of the Communist Party (Marx and Engels, 1848; English translation by Samuel Moore, 1888)",
    );
  });

  it("lists only terms with a real choice of wording that occur in the selection", () => {
    const root = tempRepo();
    const prompt = runPrompt(join(root, DOC), {
      root,
      language: "en",
      register: "plain",
      from: "p00009",
      to: "p00012",
    });
    expect(prompt).toContain('{bourgeoisie} for "bourgeoisie"');
    expect(prompt).not.toContain("{guild-master}"); // kept-as-written terms get no token
  });
});

describe("plm apply", () => {
  it("writes checked renderings, then validates the document cleanly", () => {
    const root = tempRepo();
    const { code, output } = apply(
      root,
      `=== p00009
The history of all society up to now<fn ref="2"/> is the history of class struggles.
`,
    );
    expect(output).toContain("Wrote 1 rendering(s)");
    expect(code).toBe(0);
    const written = readFileSync(renderingFile(root), "utf8");
    expect(written).toContain("p00009:\n    covers: [p00009]");
    expect(written).toContain("revision: 1");
    expect(written).toContain("ai_assisted: false");
    expect(validate(root)).toEqual([]);
  });

  it("replaces an overlapping rendering and continues its revision", () => {
    const root = tempRepo();
    apply(
      root,
      '=== p00009\nThe history of all society up to now<fn ref="2"/> is the history of class struggles.\n',
    );
    const { code, output } = apply(
      root,
      '=== p00009\nAll history up to now<fn ref="2"/> has been the history of class struggles.\n',
      true,
    );
    expect(code).toBe(0);
    expect(output).toContain("replacing p00009");
    const written = readFileSync(renderingFile(root), "utf8");
    expect(written).toContain("revision: 2");
    expect(written).toContain("ai_assisted: true");
  });

  it("refuses to write anything when a check fails", () => {
    const root = tempRepo();
    const { code, output } = apply(root, "=== p00009 p00999\nText.\n");
    expect(code).toBe(1);
    expect(output).toContain("p00999 is not a passage of this document");
    expect(existsSync(renderingFile(root))).toBe(false);
  });

  it("writes but reports warnings, e.g. a dropped footnote marker and number", () => {
    const root = tempRepo();
    const { output } = apply(root, "=== p00009\nAll history is the history of class struggles.\n");
    expect(output).toContain("footnote markers differ");
    expect(existsSync(renderingFile(root))).toBe(true);
  });
});
