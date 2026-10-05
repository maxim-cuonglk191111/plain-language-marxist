import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CollectionsEntry,
  CrossRefsFile,
  ExplanationsFile,
  GovernanceFile,
  OriginalTermsFile,
  RenderingFile,
  SourceFile,
  TermFile,
  WorkFile,
} from "@plm/schema";
import type { z } from "zod";
import type { Issue } from "./issues.ts";
import {
  COLLECTIONS_DIR,
  CROSSREFS_FILE,
  EXPLANATIONS_FILE,
  GOVERNANCE_FILE,
  ORIGINAL_TERMS_FILE,
  RENDERING_FILE,
  SOURCE_FILE,
  VOCABULARY_DIR,
  WORK_FILE,
  WORKS_DIR,
} from "./paths.ts";
import { parseContent } from "./yaml.ts";

/** A successfully parsed file: its repo-relative path, data, and a line lookup for later checks. */
export type Loaded<T> = {
  file: string;
  data: T;
  lineOf: (path: readonly PropertyKey[]) => number | undefined;
};

export type LoadedDocument = {
  slug: string;
  /** Repo-relative directory, e.g. content/works/marx/1848/communist-manifesto/ch01 */
  dir: string;
  source?: Loaded<SourceFile>;
  /** Keyed by file name without .yml, e.g. "en-plain". */
  renderings: Map<string, Loaded<RenderingFile>>;
  originalTerms?: Loaded<OriginalTermsFile>;
  explanations?: Loaded<ExplanationsFile>;
  /** "See also" links from this document's passages (task 032 D). */
  crossrefs?: Loaded<CrossRefsFile>;
};

export type LoadedWork = {
  /** Path segments under content/works: author/year/slug. */
  author: string;
  year: string;
  slug: string;
  dir: string;
  work?: Loaded<WorkFile>;
  documents: Map<string, LoadedDocument>;
};

export type Repository = {
  root: string;
  works: LoadedWork[];
  terms: Map<string, Loaded<TermFile>>;
  collections: Loaded<CollectionsEntry>[];
  governance?: Loaded<GovernanceFile>;
  /** Problems found while reading and parsing (YAML and schema errors, misplaced files). */
  issues: Issue[];
};

const subdirs = (abs: string) =>
  existsSync(abs)
    ? readdirSync(abs)
        .filter((e) => statSync(join(abs, e)).isDirectory())
        .sort()
    : [];
const filesIn = (abs: string) =>
  existsSync(abs)
    ? readdirSync(abs)
        .filter((e) => statSync(join(abs, e)).isFile())
        .sort()
    : [];

export function loadRepository(root: string): Repository {
  const issues: Issue[] = [];

  function load<S extends z.ZodType>(file: string, schema: S): Loaded<z.output<S>> | undefined {
    const result = parseContent(readFileSync(join(root, file), "utf8"), schema);
    if (result.ok) return { file, data: result.data, lineOf: result.lineOf };
    for (const p of result.problems) {
      issues.push({
        severity: "error",
        code: "schema/invalid",
        file,
        ...(p.line === undefined ? {} : { line: p.line }),
        message: p.message,
      });
    }
    return undefined;
  }

  const works: LoadedWork[] = [];
  for (const author of subdirs(join(root, WORKS_DIR))) {
    for (const year of subdirs(join(root, WORKS_DIR, author))) {
      for (const slug of subdirs(join(root, WORKS_DIR, author, year))) {
        const dir = `${WORKS_DIR}/${author}/${year}/${slug}`;
        const work: LoadedWork = { author, year, slug, dir, documents: new Map() };
        if (existsSync(join(root, dir, WORK_FILE))) {
          const loaded = load(`${dir}/${WORK_FILE}`, WorkFile);
          if (loaded) work.work = loaded;
        } else {
          issues.push({
            severity: "error",
            code: "layout/missing-work-file",
            file: dir,
            message: `missing ${WORK_FILE}`,
          });
        }
        for (const docSlug of subdirs(join(root, dir))) {
          work.documents.set(docSlug, loadDocument(`${dir}/${docSlug}`, docSlug));
        }
        works.push(work);
      }
    }
  }

  function loadDocument(dir: string, slug: string): LoadedDocument {
    const doc: LoadedDocument = { slug, dir, renderings: new Map() };
    for (const name of filesIn(join(root, dir))) {
      const file = `${dir}/${name}`;
      if (name === SOURCE_FILE) {
        const loaded = load(file, SourceFile);
        if (loaded) doc.source = loaded;
      } else if (name === ORIGINAL_TERMS_FILE) {
        const loaded = load(file, OriginalTermsFile);
        if (loaded) doc.originalTerms = loaded;
      } else if (name === EXPLANATIONS_FILE) {
        const loaded = load(file, ExplanationsFile);
        if (loaded) doc.explanations = loaded;
      } else if (name === CROSSREFS_FILE) {
        const loaded = load(file, CrossRefsFile);
        if (loaded) doc.crossrefs = loaded;
      } else if (RENDERING_FILE.test(name)) {
        const loaded = load(file, RenderingFile);
        if (loaded) doc.renderings.set(name.slice(0, -".yml".length), loaded);
      } else {
        issues.push({
          severity: "warning",
          code: "layout/unknown-file",
          file,
          message: "unknown file in a document directory",
        });
      }
    }
    if (!existsSync(join(root, dir, SOURCE_FILE))) {
      issues.push({
        severity: "error",
        code: "layout/missing-source",
        file: dir,
        message: `missing ${SOURCE_FILE}`,
      });
    }
    return doc;
  }

  const terms = new Map<string, Loaded<TermFile>>();
  for (const name of filesIn(join(root, VOCABULARY_DIR)).filter((n) => n.endsWith(".yml"))) {
    const loaded = load(`${VOCABULARY_DIR}/${name}`, TermFile);
    if (!loaded) continue;
    if (`${loaded.data.term}.yml` !== name) {
      issues.push({
        severity: "error",
        code: "layout/term-file-name",
        file: loaded.file,
        message: `file must be named ${loaded.data.term}.yml to match its term`,
      });
    }
    terms.set(loaded.data.term, loaded);
  }

  const collections: Loaded<CollectionsEntry>[] = [];
  for (const name of filesIn(join(root, COLLECTIONS_DIR)).filter((n) => n.endsWith(".yml"))) {
    const loaded = load(`${COLLECTIONS_DIR}/${name}`, CollectionsEntry);
    if (!loaded) continue;
    if (`${loaded.data.id}.yml` !== name) {
      issues.push({
        severity: "error",
        code: "layout/collection-file-name",
        file: loaded.file,
        message: `file must be named ${loaded.data.id}.yml to match its id`,
      });
    }
    collections.push(loaded);
  }

  const repo: Repository = { root, works, terms, collections, issues };
  if (existsSync(join(root, GOVERNANCE_FILE))) {
    const governance = load(GOVERNANCE_FILE, GovernanceFile);
    if (governance) repo.governance = governance;
  }
  return repo;
}
