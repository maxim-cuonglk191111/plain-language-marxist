import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCHEMA_VERSION } from "@plm/schema";
import { describe, expect, it } from "vitest";
import { applyMigrations, checkSchemaVersions, findContentFiles } from "./migrate.ts";

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
      "works/a/work.yml": `schema_version: ${SCHEMA_VERSION}\n`,
      "vocabulary/x.yml": `schema_version: ${SCHEMA_VERSION}\n`,
    });
    const files = findContentFiles([root]);
    expect(files).toHaveLength(2);
    expect(checkSchemaVersions(files, root)).toEqual([]);
  });

  it("refuses unknown and missing versions and invalid YAML", () => {
    const root = tree({
      "a.yml": `schema_version: ${SCHEMA_VERSION + 1}\n`,
      "b.yml": "title: no version\n",
      "c.yml": "key: [unclosed\n",
      "notes.txt": "ignored",
    });
    const problems = checkSchemaVersions(findContentFiles([root]), root);
    expect(problems.map((p) => p.file)).toEqual(["a.yml", "b.yml", "c.yml"]);
    expect(problems[0]?.message).toContain(`unknown schema_version ${SCHEMA_VERSION + 1}`);
    expect(problems[1]?.message).toBe("missing schema_version");
    expect(problems[2]?.message).toContain("not valid YAML");
  });

  it("reports v1 files as outdated, then upgrades them losslessly with --write", () => {
    const v1 = "schema_version: 1\nterm: capital\n# a comment survives\ndefinition: { short: x }\n";
    const root = tree({ "vocabulary/capital.yml": v1 });
    const files = findContentFiles([root]);
    expect(checkSchemaVersions(files, root)[0]?.message).toContain("run plm migrate --write");

    expect(applyMigrations(files)).toHaveLength(1);
    expect(readFileSync(files[0] ?? "", "utf8")).toBe(
      v1.replace("schema_version: 1", `schema_version: ${SCHEMA_VERSION}`),
    );
    expect(checkSchemaVersions(files, root)).toEqual([]);
    expect(applyMigrations(files)).toEqual([]); // idempotent
  });

  it("skips roots that do not exist", () => {
    expect(findContentFiles([join(tmpdir(), "plm-does-not-exist")])).toEqual([]);
  });
});
