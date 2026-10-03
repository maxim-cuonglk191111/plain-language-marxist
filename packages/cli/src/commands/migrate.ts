import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { SCHEMA_VERSION } from "@plm/schema";
import { parse as parseYaml } from "yaml";

export type VersionProblem = { file: string; message: string };

/** Content YAML files under the given roots (directories are walked, files taken as-is). */
export function findContentFiles(roots: readonly string[]): string[] {
  const files: string[] = [];
  const walk = (path: string) => {
    if (statSync(path).isDirectory()) {
      for (const entry of readdirSync(path).sort()) walk(join(path, entry));
    } else if (path.endsWith(".yml")) {
      files.push(path);
    }
  };
  for (const root of roots) if (existsSync(root)) walk(root);
  return files;
}

/**
 * Checks every file's schema_version. There are no migrations yet (v1 is the
 * only version), so anything other than SCHEMA_VERSION is refused.
 */
export function checkSchemaVersions(
  files: readonly string[],
  base = process.cwd(),
): VersionProblem[] {
  const problems: VersionProblem[] = [];
  for (const file of files) {
    const name = relative(base, file);
    let doc: unknown;
    try {
      doc = parseYaml(readFileSync(file, "utf8"));
    } catch (e) {
      problems.push({
        file: name,
        message: `not valid YAML: ${(e as Error).message.split("\n")[0]}`,
      });
      continue;
    }
    const version = (doc as { schema_version?: unknown } | null)?.schema_version;
    if (version === undefined) {
      problems.push({ file: name, message: "missing schema_version" });
    } else if (version !== SCHEMA_VERSION) {
      problems.push({
        file: name,
        message: `unknown schema_version ${JSON.stringify(version)}; this plm supports ${SCHEMA_VERSION} and has no migrations yet`,
      });
    }
  }
  return problems;
}

export function runMigrate(roots: readonly string[]): number {
  const files = findContentFiles(roots);
  if (files.length === 0) {
    console.log(`No content files found under ${roots.join(", ")}.`);
    return 0;
  }
  const problems = checkSchemaVersions(files);
  for (const p of problems) console.error(`${p.file}: ${p.message}`);
  if (problems.length > 0) {
    console.error(`\n${problems.length} of ${files.length} files cannot be migrated.`);
    return 1;
  }
  console.log(
    `All ${files.length} files are at schema_version ${SCHEMA_VERSION}. Nothing to migrate.`,
  );
  return 0;
}
