import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { SCHEMA_VERSION } from "@plm/schema";
import { parse as parseYaml } from "yaml";

export type VersionProblem = { file: string; message: string };

/** Rewrites the top-level schema_version stamp, leaving the rest of the file as written. */
const restamp = (text: string, version: number) =>
  text.replace(/^schema_version: *\d+ *$/m, `schema_version: ${version}`);

/**
 * MIGRATIONS[n] upgrades a content file's text from schema_version n to n + 1.
 * A migration must be lossless; it runs on every content file, whatever its kind.
 */
export const MIGRATIONS: Readonly<Record<number, (text: string) => string>> = {
  // v2 (task 022): term files gain the optional example, not_to_confuse and related
  // fields. Older files are valid as they are; only the stamp changes, so an older plm
  // refuses v2 files with a clear version error instead of a strict-schema failure.
  1: (text) => restamp(text, 2),
  // v3 (task 032 A): work files gain the optional short_title used in passage
  // references ("Manifesto II.17"). Older files are valid as they are.
  2: (text) => restamp(text, 3),
};

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

type FileState =
  { kind: "current" } | { kind: "migratable"; from: number } | { kind: "problem"; message: string };

function inspect(text: string): FileState {
  let doc: unknown;
  try {
    doc = parseYaml(text);
  } catch (e) {
    return { kind: "problem", message: `not valid YAML: ${(e as Error).message.split("\n")[0]}` };
  }
  const version = (doc as { schema_version?: unknown } | null)?.schema_version;
  if (version === undefined) return { kind: "problem", message: "missing schema_version" };
  if (version === SCHEMA_VERSION) return { kind: "current" };
  if (typeof version === "number" && Number.isInteger(version) && version < SCHEMA_VERSION) {
    for (let v = version; v < SCHEMA_VERSION; v++) {
      if (!MIGRATIONS[v]) {
        return { kind: "problem", message: `no migration from schema_version ${v} to ${v + 1}` };
      }
    }
    return { kind: "migratable", from: version };
  }
  return {
    kind: "problem",
    message: `unknown schema_version ${JSON.stringify(version)}; this plm supports up to ${SCHEMA_VERSION}`,
  };
}

/**
 * Checks every file's schema_version. Files at an older version that a migration
 * chain can upgrade are reported as needing `plm migrate --write`.
 */
export function checkSchemaVersions(
  files: readonly string[],
  base = process.cwd(),
): VersionProblem[] {
  const problems: VersionProblem[] = [];
  for (const file of files) {
    const state = inspect(readFileSync(file, "utf8"));
    if (state.kind === "problem")
      problems.push({ file: relative(base, file), message: state.message });
    if (state.kind === "migratable") {
      problems.push({
        file: relative(base, file),
        message: `schema_version ${state.from} is outdated (current ${SCHEMA_VERSION}); run plm migrate --write`,
      });
    }
  }
  return problems;
}

/** Upgrades every migratable file in place. Returns the files written. */
export function applyMigrations(files: readonly string[]): string[] {
  const written: string[] = [];
  for (const file of files) {
    const original = readFileSync(file, "utf8");
    const state = inspect(original);
    if (state.kind !== "migratable") continue;
    let text = original;
    for (let v = state.from; v < SCHEMA_VERSION; v++) {
      const migrate = MIGRATIONS[v];
      if (!migrate) throw new Error(`no migration from schema_version ${v}`); // inspect() checked the chain
      text = migrate(text);
    }
    writeFileSync(file, text);
    written.push(file);
  }
  return written;
}

export function runMigrate(roots: readonly string[], options: { write?: boolean } = {}): number {
  const files = findContentFiles(roots);
  if (files.length === 0) {
    console.log(`No content files found under ${roots.join(", ")}.`);
    return 0;
  }
  if (options.write) {
    const written = applyMigrations(files);
    for (const f of written) console.log(`migrated ${relative(process.cwd(), f)}`);
  }
  const problems = checkSchemaVersions(files);
  for (const p of problems) console.error(`${p.file}: ${p.message}`);
  if (problems.length > 0) {
    console.error(
      `\n${problems.length} of ${files.length} files are not at schema_version ${SCHEMA_VERSION}.`,
    );
    return 1;
  }
  console.log(`All ${files.length} files are at schema_version ${SCHEMA_VERSION}.`);
  return 0;
}
