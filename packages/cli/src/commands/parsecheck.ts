// plm parse-check: run a source adapter on one page and report problems, without
// writing content. The first step for any new kind of page (parser-guide.md).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  adapterFor,
  inspectDocument,
  missingText,
  type MissingText,
  safeFetch,
  type InspectFinding,
  type NormalizedDocument,
} from "@plm/parser";
import { parseLayout, toPlainText } from "@plm/schema";
import { fetchSource, loadSources, type Fetcher } from "./import.ts";

export type ParseCheckOptions = {
  root: string;
  url: string;
  /** Parse this local file instead of fetching (the URL still selects the adapter). */
  file?: string;
  via?: "direct" | "wayback";
  /** Save the fetched bytes as a parser fixture under this name. */
  saveFixture?: string;
  show?: number;
};

export type ParseCheckResult = {
  doc: NormalizedDocument;
  findings: InspectFinding[];
  missing: MissingText;
  via?: string;
};

const plain = (layout: string) => {
  const p = parseLayout(layout);
  return p.ok ? toPlainText(p.nodes) : layout;
};

export async function parseCheck(
  options: ParseCheckOptions,
  fetcher: Fetcher = safeFetch,
): Promise<ParseCheckResult> {
  const url = new URL(options.url);
  const adapter = adapterFor(url);
  if (!adapter) throw new Error(`no source adapter handles ${url.hostname}`);
  let bytes: Uint8Array;
  let via: string | undefined;
  if (options.file) {
    bytes = readFileSync(options.file);
  } else {
    const entry = loadSources(options.root).find((s) => s.host === url.hostname);
    if (!entry) throw new Error(`${url.hostname} is not in config/sources.yml`);
    const fetched = await fetchSource(url, entry, options.via ?? entry.via, fetcher, (l) =>
      console.error(l),
    );
    bytes = fetched.body;
    via = fetched.via;
  }
  const doc = adapter.parse({
    url: url.href,
    retrievedAt: new Date().toISOString().slice(0, 10),
    bytes,
  });

  if (options.saveFixture) {
    if (!/^[a-z0-9-]+$/.test(options.saveFixture))
      throw new Error("--save-fixture takes a kebab-case name");
    const dir = join(options.root, "packages/parser/fixtures", adapter.name);
    writeFileSync(join(dir, `${options.saveFixture}.html`), bytes);
    const provenanceFile = join(dir, "provenance.json");
    const provenance = existsSync(provenanceFile)
      ? (JSON.parse(readFileSync(provenanceFile, "utf8")) as {
          note?: string;
          fixtures: Record<string, unknown>;
        })
      : { fixtures: {} };
    provenance.fixtures[`${options.saveFixture}.html`] = {
      url: url.href,
      snapshot: via ?? url.href,
      text: "TODO: work, translation and year",
      rights: "TODO: verify before committing (public domain or openly licensed only)",
      covers: "TODO: what this fixture exercises",
    };
    writeFileSync(provenanceFile, `${JSON.stringify(provenance, null, 2)}\n`);
  }
  return {
    doc,
    findings: inspectDocument(doc),
    missing: missingText(bytes, doc),
    ...(via ? { via } : {}),
  };
}

export function printParseCheck(result: ParseCheckResult, show: number): void {
  const { doc, findings } = result;
  const counts = new Map<string, number>();
  for (const b of doc.blocks) counts.set(b.type, (counts.get(b.type) ?? 0) + 1);
  console.log(`Title:    ${doc.title}`);
  if (result.via) console.log(`Via:      ${result.via}`);
  console.log(`Blocks:   ${[...counts].map(([t, n]) => `${n} ${t}`).join(", ")}`);
  for (const [k, v] of Object.entries(doc.metadata))
    console.log(`Metadata: ${k}: ${v.slice(0, 120)}`);
  for (const w of doc.warnings) console.log(`Parser:   ${w}`);
  for (const f of findings)
    console.log(`${f.level === "error" ? "ERROR  " : "warning"}  ${f.message}  [${f.code}]`);
  const m = result.missing;
  const pct = m.sourceWords ? ((100 * m.missingWords) / m.sourceWords).toFixed(1) : "0";
  console.log(
    `Not kept: ${m.missingWords} of ${m.sourceWords} source words (${pct}%). Check that every run below is navigation, credits or editorial notes:`,
  );
  for (const r of m.runs.slice(0, 12))
    console.log(`  - ${r.length > 140 ? `${r.slice(0, 140)}…` : r}`);
  if (show > 0) {
    console.log("");
    doc.blocks.slice(0, show).forEach((b, i) => {
      const text = plain(b.text);
      console.log(
        `${String(i + 1).padStart(3)} ${b.type.padEnd(10)} ${text.length > 110 ? `${text.slice(0, 110)}…` : text}`,
      );
    });
  }
  const errors = findings.filter((f) => f.level === "error").length;
  console.log(
    `\n${errors} error(s), ${findings.length - errors} warning(s), ${doc.warnings.length} parser note(s).`,
  );
}
