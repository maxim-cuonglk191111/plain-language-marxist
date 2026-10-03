import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkSchemaVersions, findContentFiles } from "./migrate.ts";

function tree(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "plm-migrate-"));
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, ".."), { recursive: true });
    writeFileSync(full, content);
  }
  return root;
}

describe("plm migrate", () => {
  it("accepts files at the current schema_version", () => {
    const root = tree({
      "works/a/work.yml": "schema_version: 1\n",
      "vocabulary/x.yml": "schema_version: 1\n",
    });
    const files = findContentFiles([root]);
    expect(files).toHaveLength(2);
    expect(checkSchemaVersions(files, root)).toEqual([]);
  });

  it("refuses unknown and missing versions and invalid YAML", () => {
    const root = tree({
      "a.yml": "schema_version: 2\n",
      "b.yml": "title: no version\n",
      "c.yml": "key: [unclosed\n",
      "notes.txt": "ignored",
    });
    const problems = checkSchemaVersions(findContentFiles([root]), root);
    expect(problems.map((p) => p.file)).toEqual(["a.yml", "b.yml", "c.yml"]);
    expect(problems[0]?.message).toContain("unknown schema_version 2");
    expect(problems[1]?.message).toBe("missing schema_version");
    expect(problems[2]?.message).toContain("not valid YAML");
  });

  it("skips roots that do not exist", () => {
    expect(findContentFiles([join(tmpdir(), "plm-does-not-exist")])).toEqual([]);
  });
});
