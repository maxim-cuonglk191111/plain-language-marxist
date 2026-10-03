import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  fileHash,
  mergePassages,
  parseContent,
  stringifyContent,
  type MergeSummary,
} from "@plm/content";
import {
  DEFAULT_POLICY,
  FetchRefused,
  adapterFor,
  inspectDocument,
  missingText,
  isWaybackSnapshotOf,
  safeFetch,
  waybackRawUrl,
  type FetchPolicy,
} from "@plm/parser";
import { SourceFile, WorkFile } from "@plm/schema";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const SourcesConfig = z.strictObject({
  sources: z.array(
    z.strictObject({
      host: z.string().min(1),
      adapter: z.string().min(1),
      via: z.enum(["direct", "wayback"]),
      fallback: z.enum(["wayback"]).optional(),
    }),
  ),
});
type SourceEntry = z.infer<typeof SourcesConfig>["sources"][number];

export type ImportOptions = {
  url: string;
  root: string;
  /** author/year/slug, required when it cannot be derived from the URL. */
  work?: string;
  doc?: string;
  via?: "direct" | "wayback";
  yes?: boolean;
  /** Import even if the parse checks report errors. */
  force?: boolean;
  /** For tests: today's date. */
  today?: string;
};

export type Fetcher = (
  url: string,
  policy: FetchPolicy,
) => Promise<{ url: string; body: Uint8Array }>;

export type ImportResult = {
  sourceFile: string;
  snapshotFile: string;
  workFile: string;
  summary: MergeSummary;
  warnings: string[];
};

/** /archive/{author}/works/{year}/{slug}/{doc}.htm → author, year, slug, doc */
export function deriveLocation(
  url: URL,
): { author: string; year: string; slug: string; doc: string } | null {
  const m = /^\/archive\/([a-z0-9-]+)\/works\/(\d{4})\/([a-z0-9-]+)\/([a-z0-9-]+)\.html?$/.exec(
    url.pathname,
  );
  const [, author, year, slug, doc] = m ?? [];
  return author && year && slug && doc ? { author, year, slug, doc } : null;
}

export function loadSources(root: string): SourceEntry[] {
  const file = join(root, "config/sources.yml");
  if (!existsSync(file))
    throw new Error("config/sources.yml not found; plm import needs a source allowlist");
  return SourcesConfig.parse(parseYaml(readFileSync(file, "utf8"))).sources;
}

export async function fetchSource(
  url: URL,
  entry: SourceEntry,
  via: "direct" | "wayback",
  fetcher: Fetcher,
  log: (line: string) => void,
): Promise<{ via?: string; body: Uint8Array }> {
  const policyFor = (hosts: string[]): FetchPolicy => ({ ...DEFAULT_POLICY, allowedHosts: hosts });
  const wayback = async () => {
    const res = await fetcher(waybackRawUrl(url.href), policyFor(["web.archive.org"]));
    if (!isWaybackSnapshotOf(res.url, url.href)) {
      throw new FetchRefused(
        `Wayback returned ${res.url}, which is not a raw snapshot of ${url.href}`,
      );
    }
    return { via: res.url, body: res.body };
  };
  if (via === "wayback") return wayback();
  try {
    const res = await fetcher(url.href, policyFor([entry.host]));
    return { body: res.body };
  } catch (e) {
    if (e instanceof FetchRefused || entry.fallback !== "wayback") throw e;
    log(`Direct fetch failed (${(e as Error).message}); falling back to the Wayback Machine.`);
    return wayback();
  }
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

export async function runImport(
  options: ImportOptions,
  fetcher: Fetcher = safeFetch,
  log: (line: string) => void = console.log,
): Promise<ImportResult | null> {
  const url = new URL(options.url);
  const entry = loadSources(options.root).find((s) => s.host === url.hostname);
  if (!entry) throw new FetchRefused(`${url.hostname} is not in config/sources.yml`);
  const adapter = adapterFor(url);
  if (!adapter || adapter.name !== entry.adapter)
    throw new Error(`no ${entry.adapter} adapter for ${url.href}`);

  const derived = deriveLocation(url);
  const [author, year, slug] = options.work?.split("/") ?? [
    derived?.author,
    derived?.year,
    derived?.slug,
  ];
  const doc = options.doc ?? derived?.doc;
  if (!author || !year || !slug || !doc) {
    throw new Error(
      "cannot derive the work from this URL; pass --work author/year/slug and --doc name",
    );
  }

  const fetched = await fetchSource(url, entry, options.via ?? entry.via, fetcher, log);
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  const parsed = adapter.parse({
    url: url.href,
    retrievedAt: today,
    bytes: fetched.body,
    ...(fetched.via ? { via: fetched.via } : {}),
  });

  const docDir = `content/works/${author}/${year}/${slug}/${doc}`;
  const sourceFile = `${docDir}/source.yml`;
  const workFile = `content/works/${author}/${year}/${slug}/work.yml`;
  let existing: SourceFile | undefined;
  if (existsSync(join(options.root, sourceFile))) {
    const result = parseContent(readFileSync(join(options.root, sourceFile), "utf8"), SourceFile);
    if (!result.ok) throw new Error(`${sourceFile} is invalid; fix it before re-importing`);
    existing = result.data;
  }
  const findings = inspectDocument(parsed);
  const { passages, summary } = mergePassages(existing?.passages, parsed.blocks);

  log(`Source:    ${url.href}${fetched.via ? `\nVia:       ${fetched.via}` : ""}`);
  log(`Title:     ${parsed.title}`);
  log(`Target:    ${docDir}/`);
  const counts = new Map<string, number>();
  for (const b of parsed.blocks) counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
  log(`Blocks:    ${[...counts].map(([t, n]) => `${n} ${t}`).join(", ")}`);
  log(
    `Passages:  ${summary.kept} kept, ${summary.added} added, ${summary.tombstoned} tombstoned, ${summary.layoutChanged} with layout changes`,
  );
  for (const [k, v] of Object.entries(parsed.metadata)) log(`Metadata:  ${k}: ${v.slice(0, 160)}`);
  for (const w of parsed.warnings) log(`Warning:   ${w}`);
  const missing = missingText(fetched.body, parsed);
  log(
    `Not kept:  ${missing.missingWords} of ${missing.sourceWords} source words; longest: ${
      missing.runs
        .slice(0, 3)
        .map((r) => `"${r.slice(0, 60)}…"`)
        .join(", ") || "none"
    }`,
  );
  for (const f of findings) log(`${f.level === "error" ? "Error:  " : "Check:  "}   ${f.message}`);
  if (findings.some((f) => f.level === "error") && !options.force) {
    log(
      "The parse checks found errors, so nothing was written. Investigate with plm parse-check (docs/architecture/parser-guide.md), or pass --force.",
    );
    return null;
  }

  if (!options.yes && !(await confirm("Write these files?"))) {
    log("Nothing written. (Re-run with --yes to skip the prompt, e.g. in CI.)");
    return null;
  }

  const snapshotDir = `ingestion/snapshots/${author}/${year}/${slug}/${doc}`;
  const snapshotHash = fileHash(fetched.body);
  let snapshotFile = `${snapshotDir}/${today}.html`;
  for (let n = 2; existsSync(join(options.root, snapshotFile)); n++) {
    if (fileHash(readFileSync(join(options.root, snapshotFile))) === snapshotHash) break;
    snapshotFile = `${snapshotDir}/${today}-${n}.html`;
  }

  const source: SourceFile = {
    schema_version: 1,
    document: `document:${author}:${year}:${slug}:${doc}`,
    title: parsed.title,
    source: {
      provider: adapter.name,
      url: url.href,
      retrieved_at: today,
      ...(fetched.via ? { via: fetched.via } : {}),
      snapshot: snapshotFile,
      snapshot_hash: snapshotHash,
      parser: { name: adapter.name, version: adapter.version },
    },
    passages,
  };

  let work: WorkFile;
  if (existsSync(join(options.root, workFile))) {
    const result = parseContent(readFileSync(join(options.root, workFile), "utf8"), WorkFile);
    if (!result.ok)
      throw new Error(`${workFile} is invalid; fix it before importing more documents`);
    work = result.data;
    if (!work.documents.includes(doc)) work.documents.push(doc);
  } else {
    work = {
      schema_version: 1,
      id: `work:${author}:${year}:${slug}`,
      title: parsed.title,
      authors: [author],
      year: Number(year),
      rights: { status: "UNVERIFIED", attribution: "Marxists Internet Archive" },
      documents: [doc],
    };
  }

  const write = (file: string, content: string | Uint8Array) => {
    mkdirSync(dirname(join(options.root, file)), { recursive: true });
    writeFileSync(join(options.root, file), content);
  };
  write(snapshotFile, fetched.body);
  write(sourceFile, stringifyContent(SourceFile, source));
  write(workFile, stringifyContent(WorkFile, work));
  log(`Wrote ${sourceFile}, ${workFile} and ${snapshotFile}.`);
  if (work.rights.status === "UNVERIFIED") {
    log(
      "Rights are UNVERIFIED: a maintainer must fill in work.yml rights before this can be published.",
    );
  }
  return { sourceFile, snapshotFile, workFile, summary, warnings: parsed.warnings };
}
