import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  DataDocument,
  DataIndex,
  DataManifest,
  DataSearch,
  DataTerm,
  SCHEMA_VERSION,
  splitPassageRef,
  type TermFile,
} from "@plm/schema";
import { renderTokens, usageCounts } from "@plm/terms";
import { findTermRanges, termSurfaces } from "./annotate.ts";
import { basedOnHash, fileHash, plainText } from "./hash.ts";
import type { Issue } from "./issues.ts";
import { loadRepository, type LoadedWork } from "./load.ts";
import { publicPath } from "./paths.ts";
import { validateRepository } from "./validate.ts";

export type BuildOptions = {
  root: string;
  /** Output directory; data goes to <out>/data/v1/. */
  out: string;
  /** e.g. "2026.10.03-abc1234"; derived from the content commit by the CLI. */
  release: string;
  contentCommit: string;
};

export type BuildResult =
  | { ok: true; files: string[]; manifest: DataManifest }
  | { ok: false; issues: Issue[] };

/** documents/archive/marx/works/1848/communist-manifesto/ch01.json */
export const documentDataPath = (sourceUrl: string) =>
  `documents${publicPath(sourceUrl).replace(/\.html?$/, "")}.json`;

const json = (value: unknown) => `${JSON.stringify(value)}\n`;

/**
 * Builds the static data contract v1 (SDD §10.2). Refuses to build when
 * `plm validate` reports errors. Deterministic: the same repository and
 * options always produce byte-identical files.
 */
export function buildData(options: BuildOptions): BuildResult {
  const repo = loadRepository(options.root);
  const issues = validateRepository(repo);
  if (issues.some((i) => i.severity === "error")) return { ok: false, issues };

  const vocabulary = new Map<string, TermFile>([...repo.terms].map(([slug, t]) => [slug, t.data]));
  const files = new Map<string, string>();
  const published = repo.works
    .filter((w): w is LoadedWork & { work: NonNullable<LoadedWork["work"]> } => w.work !== undefined)
    .filter((w) => w.work.data.rights.status !== "BLOCKED" && w.work.data.rights.status !== "UNVERIFIED");

  const usageTexts: { text: string; workId: string; authors: string[] }[] = [];
  const index: DataIndex = { version: 1, release: options.release, works: [], collections: [], terms: [] };
  const search: DataSearch = { version: 1, release: options.release, documents: [], entries: [] };
  /** Reader path and title by document id, for term-card example links. */
  const documentPaths = new Map<string, { path: string; title: string }>();
  let passageCount = 0;
  let renderingCount = 0;
  /** Reader path of every published document, for cross-reference targets (task 032 D). */
  const publishedPaths = new Map<string, string>();
  for (const work of published) {
    for (const d of work.documents.values()) {
      if (d.source) publishedPaths.set(d.source.data.document, publicPath(d.source.data.source.url));
    }
  }

  for (const work of published) {
    const w = work.work.data;
    const rights = w.rights;
    const entry: DataIndex["works"][number] = {
      id: w.id,
      title: w.title,
      ...(w.short_title ? { short_title: w.short_title } : {}),
      authors: w.authors,
      year: w.year,
      ...(w.translation ? { translation: w.translation } : {}),
      rights: {
        status: rights.status as DataIndex["works"][number]["rights"]["status"],
        ...(rights.license ? { license: rights.license } : {}),
        attribution: rights.attribution,
      },
      documents: [],
    };

    for (const slug of w.documents) {
      const doc = work.documents.get(slug);
      const source = doc?.source?.data;
      if (!doc || !source) continue;
      const active = source.passages.filter((p) => p.state === "active");
      const hashes = new Map(source.passages.map((p) => [p.id, p.hash]));
      const annotations = doc.originalTerms?.data.annotations ?? [];

      // Links to unpublished (blocked) works are left out; validate warns about them.
      const crossrefs: NonNullable<DataDocument["crossrefs"]> = (
        doc.crossrefs?.data.crossrefs ?? []
      ).flatMap((c) => {
        const target = splitPassageRef(c.to);
        const path = publishedPaths.get(target.document);
        if (!path) return [];
        return [
          {
            from: c.from,
            to: { ...target, path },
            kind: c.kind,
            ...(c.note ? { note: c.note } : {}),
          },
        ];
      });

      const renderings: DataDocument["renderings"] = {};
      const covered: Record<string, number> = {};
      for (const [name, file] of [...doc.renderings].sort(([a], [b]) => a.localeCompare(b))) {
        renderings[name] = Object.values(file.data.renderings).map((r) => {
          usageTexts.push({ text: r.text, workId: w.id, authors: w.authors });
          const resolved = renderTokens(r.text, vocabulary, { workId: w.id, authors: w.authors });
          if (!resolved.ok) throw new Error(`${file.file}: ${resolved.error}`); // validate already checked tokens
          return {
            covers: r.covers,
            revision: r.revision,
            ai_assisted: r.ai_assisted,
            stale: basedOnHash(r.covers.map((id) => hashes.get(id) ?? "")) !== r.based_on,
            text_raw: r.text,
            text: resolved.text,
          };
        });
        covered[name] = renderings[name].reduce((n, r) => n + r.covers.length, 0);
        renderingCount += renderings[name].length;
      }

      const document: DataDocument = {
        version: 1,
        id: source.document,
        work_id: w.id,
        title: source.title,
        path: publicPath(source.source.url),
        source: {
          provider: source.source.provider,
          url: source.source.url,
          retrieved_at: source.source.retrieved_at,
          ...(source.source.via ? { via: source.source.via } : {}),
          attribution: rights.attribution,
        },
        passages: active.map((p) => ({
          id: p.id,
          type: p.type,
          ...(p.level !== undefined ? { level: p.level } : {}),
          ...(p.label !== undefined ? { label: p.label } : {}),
          text: p.text,
          annotations: annotations
            .filter((a) => a.passage === p.id)
            .map(({ term, match, occurrence }) => ({ term, match, occurrence })),
        })),
        renderings,
        explanations: Object.entries(doc.explanations?.data.explanations ?? {}).map(([id, e]) => ({
          id,
          kind: e.kind,
          targets: e.targets,
          text: e.text,
          sources: (e.sources ?? []) as Record<string, string | number>[],
          ai_assisted: e.ai_assisted,
        })),
        ...(crossrefs.length ? { crossrefs } : {}),
      };
      documentPaths.set(source.document, { path: document.path, title: source.title });
      const d = search.documents.push({ path: document.path, title: source.title, work: w.title }) - 1;
      for (const p of document.passages) search.entries.push({ d, p: p.id, l: "o", t: plainText(p.text) ?? "" });
      for (const r of renderings["en-plain"] ?? []) {
        search.entries.push({ d, p: r.covers[0] ?? "", l: "p", t: plainText(r.text) ?? "" });
      }
      for (const e of document.explanations) search.entries.push({ d, p: e.targets[0] ?? "", l: "e", t: plainText(e.text) ?? "" });
      const dataPath = documentDataPath(source.source.url);
      files.set(dataPath, json(DataDocument.parse(document)));
      passageCount += active.length;
      entry.documents.push({
        id: source.document,
        slug,
        title: source.title,
        path: document.path,
        data: dataPath,
        passages: active.length,
        covered,
      });
    }
    index.works.push(entry);
  }

  const exampleFor = (t: TermFile): Pick<DataTerm, "example"> => {
    const doc = t.example && documentPaths.get(t.example.document);
    if (!t.example || !doc) return {};
    const { text, passage } = t.example;
    return { example: { text, passage, title: doc.title, href: `${doc.path}#${passage}` } };
  };

  const surfaces = termSurfaces(vocabulary.values());
  const linksFor = (t: TermFile): Pick<DataTerm, "links"> => {
    const skip = new Set([t.term]);
    const fields = [
      ["short", t.definition.short],
      ["not_to_confuse", t.not_to_confuse],
      ["long", t.definition.long],
    ] as const;
    const links = fields.flatMap(([field, text]) =>
      text ? findTermRanges(text, surfaces, { skip, firstOnly: true }).map((r) => ({ field, ...r })) : [],
    );
    return links.length ? { links } : {};
  };

  const usage = usageCounts(usageTexts, vocabulary);
  for (const [slug, t] of [...vocabulary].sort(([a], [b]) => a.localeCompare(b))) {
    const term: DataTerm = {
      version: 1,
      term: slug,
      aliases: t.aliases ?? [],
      original: t.original,
      definition: {
        short: t.definition.short,
        ...(t.definition.long ? { long: t.definition.long } : {}),
        sources: (t.definition.sources ?? []) as Record<string, string | number>[],
      },
      ...(t.senses
        ? {
            senses: t.senses.map((s) => ({
              scope: s.scope,
              short: s.short,
              ...(s.long ? { long: s.long } : {}),
              sources: s.sources as Record<string, string | number>[],
            })),
          }
        : {}),
      ...exampleFor(t),
      ...linksFor(t),
      ...(t.not_to_confuse ? { not_to_confuse: t.not_to_confuse } : {}),
      related: (t.related ?? []).flatMap((r) => {
        const other = vocabulary.get(r);
        return other ? [{ term: r, name: other.original["sg"] ?? r }] : [];
      }),
      default: t.default,
      scoped_defaults: t.scoped_defaults ?? [],
      renderings: Object.entries(t.renderings).map(([key, r]) => ({
        key,
        forms: r.forms,
        reason: r.reason,
        ...(r.limitation ? { limitation: r.limitation } : {}),
        usage: usage.get(slug)?.get(key) ?? 0,
      })),
    };
    search.entries.push({ d: -1, p: slug, l: "v", t: `${t.original["sg"] ?? slug}: ${t.definition.short}` });
    const path = `terms/${slug}.json`;
    files.set(path, json(DataTerm.parse(term)));
    index.terms.push({ term: slug, data: path });
  }

  for (const c of [...repo.collections].sort((a, b) => a.data.id.localeCompare(b.data.id))) {
    const d = c.data;
    index.collections.push({
      kind: d.kind,
      id: d.id,
      title: d.title,
      ...(d.description ? { description: d.description } : {}),
      ...(d.kind === "reading_path" ? { rationale: d.rationale } : {}),
      items: d.kind === "collection" ? d.documents : d.items,
    });
  }
  files.set("index.json", json(DataIndex.parse(index)));
  files.set("search.json", json(DataSearch.parse(search)));

  const manifest: DataManifest = {
    version: 1,
    release: options.release,
    content_commit: options.contentCommit,
    schema_versions: { content: SCHEMA_VERSION, data: 1 },
    counts: {
      works: index.works.length,
      documents: index.works.reduce((n, w) => n + w.documents.length, 0),
      passages: passageCount,
      renderings: renderingCount,
      terms: vocabulary.size,
    },
    files: Object.fromEntries([...files].sort(([a], [b]) => a.localeCompare(b)).map(([p, c]) => [p, fileHash(c)])),
  };
  files.set("manifest.json", json(DataManifest.parse(manifest)));

  const base = join(options.out, "data/v1");
  rmSync(base, { recursive: true, force: true });
  for (const [path, content] of files) {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  }
  return { ok: true, files: [...files.keys()].sort(), manifest };
}
