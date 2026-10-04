// plm prompt / plm apply: LLM-assisted drafting without server-side AI (SDD §8.4).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  annotatePassages,
  applyRenderings,
  loadRepository,
  parseContent,
  renderingFileName,
  stringifyContent,
  validateRepository,
  type LoadedDocument,
  type LoadedWork,
  type Repository,
} from "@plm/content";
import {
  buildPrompt,
  checkRenderings,
  extractCoreRules,
  extractTemplate,
  parseExchange,
  parseHardWords,
  type HardWord,
} from "@plm/checks";
import { parse as parseYaml } from "yaml";
import { RenderingFile, type TermFile } from "@plm/schema";

/** docs/editorial/hard-words.yml, or no list if the repository has none. */
export function loadHardWords(root: string): HardWord[] {
  const file = join(root, "docs/editorial/hard-words.yml");
  return existsSync(file) ? parseHardWords(parseYaml(readFileSync(file, "utf8"))) : [];
}

type Located = { repo: Repository; work: LoadedWork; doc: LoadedDocument };

function locate(root: string, documentDir: string): Located {
  const repoRoot = resolve(root);
  const dir = relative(repoRoot, resolve(documentDir)).replace(/\\/g, "/");
  const repo = loadRepository(repoRoot);
  for (const work of repo.works) {
    const doc = [...work.documents.values()].find((d) => d.dir === dir);
    if (doc?.source && work.work) return { repo, work, doc };
  }
  throw new Error(`no document with valid source.yml and work.yml at ${dir}`);
}

export type PromptOptions = {
  root: string;
  from?: string;
  to?: string;
  next?: number;
  language: string;
  register: string;
};

export function runPrompt(documentDir: string, options: PromptOptions): string {
  const { repo, work, doc } = locate(options.root, documentDir);
  const source = doc.source?.data;
  const workData = work.work?.data;
  if (!source || !workData) throw new Error("document not loaded");
  const active = source.passages.filter((p) => p.state === "active");

  const selectPassages = (): typeof active => {
    if (options.from || options.to) {
      const start = options.from ? active.findIndex((p) => p.id === options.from) : 0;
      const end = options.to ? active.findIndex((p) => p.id === options.to) : active.length - 1;
      if (start === -1 || end === -1 || end < start)
        throw new Error("--from/--to must name active passages in order");
      return active.slice(start, end + 1);
    }
    const rendered = doc.renderings.get(
      renderingFileName(options.language, options.register).slice(0, -4),
    );
    const covered = new Set(
      Object.values(rendered?.data.renderings ?? {}).flatMap((r) => r.covers),
    );
    const next = active.filter((p) => !covered.has(p.id)).slice(0, options.next ?? 15);
    if (next.length === 0)
      throw new Error("every passage already has a rendering; use --from/--to to redo some");
    return next;
  };
  const selected = selectPassages();

  const terms = [...repo.terms.values()].map((t) => t.data);
  const present = new Set(annotatePassages(selected, terms).annotations.map((a) => a.term));
  const translation = workData.translation
    ? `; English translation by ${workData.translation.translator}, ${workData.translation.year}`
    : "";
  const authors = workData.authors.map((a) => a.charAt(0).toUpperCase() + a.slice(1)).join(" and ");

  return buildPrompt({
    template: extractTemplate(
      readFileSync(join(repo.root, "docs/editorial/llm-prompt.md"), "utf8"),
    ),
    coreRules: extractCoreRules(readFileSync(join(repo.root, "docs/editorial/STYLE.md"), "utf8")),
    work: `${workData.title} (${authors}, ${workData.year}${translation})`,
    terms: terms.filter((t) => present.has(t.term)),
    hardWords: loadHardWords(repo.root),
    passages: selected,
  });
}

export type ApplyOptions = {
  root: string;
  language: string;
  register: string;
  aiAssisted: boolean;
  log?: (line: string) => void;
};

/** Every surface word of every term, for the inline-gloss check. */
function termWords(terms: readonly TermFile[]): string[] {
  const words = new Set<string>();
  for (const t of terms) {
    Object.values(t.original).forEach((w) => words.add(w));
    t.aliases?.forEach((w) => words.add(w));
    Object.values(t.renderings).forEach((r) => Object.values(r.forms).forEach((w) => words.add(w)));
  }
  return [...words];
}

/** Returns the process exit code: 1 if anything blocked the write. */
export function runApply(documentDir: string, input: string, options: ApplyOptions): number {
  const log = options.log ?? console.log;
  const { repo, doc } = locate(options.root, documentDir);
  const source = doc.source?.data;
  if (!source) throw new Error("document not loaded");

  const parsed = parseExchange(input);
  if (!parsed.ok) {
    log(`error   line ${parsed.error.line}: ${parsed.error.message}`);
    return 1;
  }
  const vocabulary = new Map([...repo.terms].map(([slug, t]) => [slug, t.data]));
  const findings = checkRenderings(parsed.entries, {
    passages: source.passages,
    vocabulary,
    termWords: termWords([...vocabulary.values()]),
    hardWords: loadHardWords(repo.root),
  });
  for (const f of findings)
    log(`${f.level.padEnd(7)} ${f.covers.join(" ").padEnd(14)} ${f.message}  [${f.code}]`);
  const errors = findings.filter((f) => f.level === "error").length;
  if (errors > 0) {
    log(`\n${errors} error(s): nothing written. Fix them and run plm apply again.`);
    return 1;
  }

  const name = renderingFileName(options.language, options.register);
  const file = `${doc.dir}/${name}`;
  let existing: RenderingFile | undefined;
  if (existsSync(join(repo.root, file))) {
    const result = parseContent(readFileSync(join(repo.root, file), "utf8"), RenderingFile);
    if (!result.ok) throw new Error(`${file} is invalid; fix it first (plm validate)`);
    existing = result.data;
  }
  const { file: updated, replaced } = applyRenderings(existing, parsed.entries, source, {
    language: options.language,
    register: options.register,
    aiAssisted: options.aiAssisted,
  });
  writeFileSync(join(repo.root, file), stringifyContent(RenderingFile, updated));
  const warnings = findings.length;
  log(
    `\nWrote ${parsed.entries.length} rendering(s) to ${file}` +
      (replaced.length ? ` (replacing ${replaced.join(", ")})` : "") +
      (warnings ? `; ${warnings} warning(s) to fix or explain in the PR.` : "."),
  );

  const issues = validateRepository(loadRepository(repo.root)).filter((i) =>
    i.file.startsWith(doc.dir),
  );
  for (const i of issues)
    log(`validate ${i.severity}: ${i.file}${i.line ? `:${i.line}` : ""} ${i.message}`);
  return issues.some((i) => i.severity === "error") ? 1 : 0;
}

export type ReviewOptions = {
  root: string;
  language: string;
  register: string;
  log?: (line: string) => void;
};

/**
 * plm review: runs every rendering check (including hard words and sentence
 * length) over a document's existing Plain English, for a review pass. Reports
 * only; never writes. Returns the number of passages with findings.
 */
export function runReview(documentDir: string, options: ReviewOptions): number {
  const log = options.log ?? console.log;
  const { repo, doc } = locate(options.root, documentDir);
  const source = doc.source?.data;
  if (!source) throw new Error(`no source.yml at ${documentDir}`);
  const name = renderingFileName(options.language, options.register).slice(0, -4);
  const rendering = doc.renderings.get(name)?.data;
  if (!rendering) throw new Error(`no ${name}.yml at ${documentDir}`);
  const vocabulary = new Map([...repo.terms].map(([slug, t]) => [slug, t.data]));
  const entries = Object.values(rendering.renderings).map((r) => ({
    covers: r.covers,
    text: r.text,
  }));
  const findings = checkRenderings(entries, {
    passages: source.passages,
    vocabulary,
    termWords: termWords([...vocabulary.values()]),
    hardWords: loadHardWords(repo.root),
  });
  for (const f of findings)
    log(`${f.level.padEnd(7)} ${f.covers.join(" ").padEnd(14)} ${f.message}  [${f.code}]`);
  const passages = new Set(findings.map((f) => f.covers[0]));
  log(`\n${findings.length} finding(s) in ${passages.size} of ${entries.length} rendering(s).`);
  return passages.size;
}
