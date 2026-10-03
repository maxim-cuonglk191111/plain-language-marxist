// Guards against invisible characters sneaking into source files (a backspace once
// replaced the \b of a regex). Tabs, newlines and carriage returns are allowed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("..", import.meta.url);
const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  cwd: root,
  encoding: "utf8",
})
  .split("\n")
  .filter(
    (f) =>
      /\.(ts|tsx|mjs|js|json|ya?ml|md|css)$/.test(f) &&
      !f.includes("fixtures/") &&
      !f.startsWith("e2e/fixture-repo/"),
  );

describe("text hygiene", () => {
  it("no tracked source file contains control characters", () => {
    const offenders = files.filter((f) => {
      const text = readFileSync(new URL(f, root), "utf8");
      return [...text].some((c) => {
        const code = c.charCodeAt(0);
        return code < 32 && code !== 9 && code !== 10 && code !== 13;
      });
    });
    expect(offenders).toEqual([]);
  });
});
