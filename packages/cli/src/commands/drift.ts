// plm diff-source: detect source drift without writing anything (SDD §7.4).
import { fileHash, loadRepository, mergePassages, plainText } from "@plm/content";
import { adapterFor, safeFetch, type NormalizedBlock } from "@plm/parser";
import type { SourceFile } from "@plm/schema";
import { fetchSource, loadSources, type Fetcher } from "./import.ts";

export type DriftStatus =
  "UNCHANGED" | "FORMATTING_CHANGED" | "TEXT_CHANGED" | "STRUCTURE_CHANGED" | "UNAVAILABLE";

export type DriftResult = {
  document: string;
  url: string;
  status: DriftStatus;
  detail?: string;
  /** Passage-level changes, for TEXT_CHANGED and STRUCTURE_CHANGED. */
  changes: string[];
};

const short = (layout: string) => {
  const text = plainText(layout) ?? layout;
  return text.length > 100 ? `${text.slice(0, 100)}…` : text;
};

/** Compares freshly parsed blocks with the stored passages. */
export function classify(
  source: SourceFile,
  bytes: Uint8Array,
  blocks: readonly NormalizedBlock[],
): Omit<DriftResult, "document" | "url"> {
  if (fileHash(bytes) === source.source.snapshot_hash) return { status: "UNCHANGED", changes: [] };
  const active = source.passages.filter((p) => p.state === "active");
  const { passages, summary } = mergePassages(source.passages, blocks);
  // The page bytes differ (checked above) but every passage's text is the same: formatting only.
  if (summary.added === 0 && summary.tombstoned === 0) {
    return {
      status: "FORMATTING_CHANGED",
      detail:
        summary.layoutChanged > 0
          ? `${summary.layoutChanged} passage(s) with layout-only changes`
          : "page markup changed; passage text and layout identical",
      changes: [],
    };
  }
  const byId = new Map(source.passages.map((p) => [p.id, p]));
  const changes: string[] = [];
  for (const p of passages) {
    if (p.state === "tombstoned" && byId.get(p.id)?.state === "active") {
      changes.push(`removed or changed ${p.id}: "${short(p.text)}"`);
    } else if (!byId.has(p.id)) {
      const from = p.derived_from?.length ? ` (replaces ${p.derived_from.join(", ")})` : "";
      changes.push(`new text${from}: "${short(p.text)}"`);
    }
  }
  const sameShape =
    blocks.length === active.length && blocks.every((b, i) => b.type === active[i]?.type);
  return {
    status: sameShape ? "TEXT_CHANGED" : "STRUCTURE_CHANGED",
    detail: `${summary.kept} kept, ${summary.tombstoned} removed or changed, ${summary.added} new`,
    changes,
  };
}

export async function runDiffSource(
  options: { root: string; via?: "direct" | "wayback"; only?: string },
  fetcher: Fetcher = safeFetch,
): Promise<DriftResult[]> {
  const repo = loadRepository(options.root);
  const sources = loadSources(options.root);
  const results: DriftResult[] = [];
  for (const work of repo.works) {
    for (const doc of work.documents.values()) {
      const source = doc.source?.data;
      if (
        !source ||
        (options.only && !doc.dir.startsWith(options.only.replace(/\\/g, "/").replace(/\/$/, "")))
      )
        continue;
      const url = new URL(source.source.url);
      const base = { document: source.document, url: url.href, changes: [] as string[] };
      const entry = sources.find((s) => s.host === url.hostname);
      const adapter = adapterFor(url);
      if (!entry || !adapter) {
        results.push({
          ...base,
          status: "UNAVAILABLE",
          detail: `${url.hostname} is not in config/sources.yml`,
        });
        continue;
      }
      try {
        const fetched = await fetchSource(url, entry, options.via ?? entry.via, fetcher, () => {});
        const parsed = adapter.parse({ url: url.href, retrievedAt: "", bytes: fetched.body });
        results.push({ ...base, ...classify(source, fetched.body, parsed.blocks) });
      } catch (e) {
        results.push({ ...base, status: "UNAVAILABLE", detail: (e as Error).message });
      }
    }
  }
  return results;
}

/** Markdown report, used as the body of the drift issue. */
export function driftReport(results: readonly DriftResult[]): string {
  const changed = results.filter((r) => r.status !== "UNCHANGED");
  const lines = [
    `# Source drift report`,
    "",
    `${results.length} document(s) checked; ${changed.length} need attention.`,
    "",
    "| Document | Status | Detail |",
    "|---|---|---|",
    ...results.map((r) => `| [${r.document}](${r.url}) | ${r.status} | ${r.detail ?? ""} |`),
  ];
  for (const r of changed.filter((c) => c.changes.length)) {
    lines.push("", `## ${r.document}`, "", ...r.changes.map((c) => `- ${c}`));
  }
  lines.push(
    "",
    "Nothing has been changed. To apply a source update, a maintainer runs `plm import <url>`; renderings of changed passages are then marked stale for review.",
  );
  return `${lines.join("\n")}\n`;
}
