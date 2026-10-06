import {
  PUBLISHABLE_RIGHTS,
  collectNodes,
  parseLayout,
  splitPassageRef,
  type LayoutNode,
  type Passage,
} from "@plm/schema";
import { checkTokens } from "@plm/terms";
import { basedOnHash, passageHash, plainText } from "./hash.ts";
import type { Issue, Severity } from "./issues.ts";
import {
  loadRepository,
  type Loaded,
  type LoadedDocument,
  type LoadedWork,
  type Repository,
} from "./load.ts";
import { publicPath, renderingFileName } from "./paths.ts";

export type ValidateOptions = {
  /**
   * Extra checks on rendering text (term tokens, task 010). Called once per
   * rendering with the parsed vocabulary available on the repository.
   */
  checkRenderingText?: (
    text: string,
    repo: Repository,
  ) => { severity: Severity; code: string; message: string }[];
};

type Reporter = (
  severity: Severity,
  code: string,
  loaded: Pick<Loaded<unknown>, "file" | "lineOf"> | { file: string; lineOf?: undefined },
  path: readonly PropertyKey[],
  message: string,
) => void;

function layoutNodes(text: string): LayoutNode[] {
  const result = parseLayout(text);
  return result.ok ? result.nodes : [];
}

/** Whole-word occurrences, so "bourgeois" never matches inside "bourgeoisie". */
const WORD_CHAR = /[\p{L}\p{N}]/u;

export function countWholeWords(haystack: string, needle: string): number {
  let count = 0;
  for (let i = haystack.indexOf(needle); i !== -1; i = haystack.indexOf(needle, i + 1)) {
    const before = haystack[i - 1] ?? "";
    const after = haystack[i + needle.length] ?? "";
    if (!WORD_CHAR.test(before) && !WORD_CHAR.test(after)) count++;
  }
  return count;
}

/** Term-card prose aims for 20 words a sentence; validate warns above this. */
export const MAX_SENTENCE_WORDS = 25;

/** Sentences of `text` longer than MAX_SENTENCE_WORDS words. */
export function longSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=["“(]?[A-Z])|\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length > MAX_SENTENCE_WORDS);
}

export function validateRepository(repo: Repository, options: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [...repo.issues];
  const report: Reporter = (severity, code, loaded, path, message) => {
    const line = loaded.lineOf?.(path);
    issues.push({
      severity,
      code,
      file: loaded.file,
      ...(line === undefined ? {} : { line }),
      message,
    });
  };

  const vocabulary = new Map([...repo.terms].map(([slug, t]) => [slug, t.data]));

  // Index of public document paths → passages, for internal link checks.
  const documentsByPath = new Map<string, Set<string>>();
  const workIds = new Set<string>();
  const authors = new Set<string>();
  const documentIds = new Set<string>();
  /** Active passages by document id, and documents of blocked works, for cross-references. */
  const activeByDocument = new Map<string, Set<string>>();
  const blockedDocuments = new Set<string>();
  for (const w of repo.works) {
    if (w.work) {
      workIds.add(w.work.data.id);
      w.work.data.authors.forEach((a) => authors.add(a));
    }
    for (const d of w.documents.values()) {
      if (!d.source) continue;
      documentIds.add(d.source.data.document);
      activeByDocument.set(
        d.source.data.document,
        new Set(d.source.data.passages.filter((p) => p.state === "active").map((p) => p.id)),
      );
      if (w.work?.data.rights.status === "BLOCKED") blockedDocuments.add(d.source.data.document);
      documentsByPath.set(
        publicPath(d.source.data.source.url),
        new Set(d.source.data.passages.map((p) => p.id)),
      );
    }
  }

  const checkLinks = (text: string, loaded: Loaded<unknown>, path: readonly PropertyKey[]) => {
    for (const link of collectNodes(layoutNodes(text), "a")) {
      if (!link.href.startsWith("/")) continue; // external links: scheduled link check (task 018)
      const [target = "", fragment] = link.href.split("#", 2);
      if (target.startsWith("/vocabulary/")) {
        const term = target.replace(/^\/vocabulary\/|\/$/g, "");
        if (term && !repo.terms.has(term))
          report("error", "link/unknown-term", loaded, path, `link to unknown term ${link.href}`);
        continue;
      }
      const passages = documentsByPath.get(target);
      if (!passages) {
        report(
          "error",
          "link/unknown-path",
          loaded,
          path,
          `internal link ${link.href} does not match any document`,
        );
      } else if (fragment && !passages.has(fragment)) {
        report(
          "error",
          "link/unknown-passage",
          loaded,
          path,
          `internal link ${link.href}: no passage ${fragment} in that document`,
        );
      }
    }
  };

  for (const work of repo.works) validateWork(work);

  function validateWork(work: LoadedWork) {
    const w = work.work;
    if (w) {
      const expectedId = `work:${work.author}:${work.year}:${work.slug}`;
      if (w.data.id !== expectedId)
        report(
          "error",
          "work/id-mismatch",
          w,
          ["id"],
          `id must be ${expectedId} to match the directory`,
        );
      if (String(w.data.year) !== work.year)
        report(
          "error",
          "work/year-mismatch",
          w,
          ["year"],
          `year must be ${work.year} to match the directory`,
        );

      const status = w.data.rights.status;
      if (status === "UNVERIFIED") {
        report(
          "error",
          "rights/unverified",
          w,
          ["rights", "status"],
          "rights are not verified; fill in work.yml rights before this work can be published",
        );
      } else if (status === "BLOCKED") {
        report(
          "warning",
          "rights/blocked",
          w,
          ["rights", "status"],
          "work is blocked and will be excluded from the build",
        );
      } else if (!PUBLISHABLE_RIGHTS.includes(status)) {
        report(
          "error",
          "rights/not-publishable",
          w,
          ["rights", "status"],
          `rights status ${status} is not publishable`,
        );
      }

      w.data.documents.forEach((slug, i) => {
        if (!work.documents.has(slug))
          report(
            "error",
            "work/missing-document",
            w,
            ["documents", i],
            `document ${slug} is listed but ${work.dir}/${slug}/ does not exist`,
          );
      });
      for (const slug of work.documents.keys()) {
        if (!w.data.documents.includes(slug))
          report(
            "error",
            "work/unlisted-document",
            w,
            ["documents"],
            `directory ${slug}/ is not listed in documents`,
          );
      }
    }
    for (const doc of work.documents.values()) validateDocument(work, doc);
  }

  function validateDocument(work: LoadedWork, doc: LoadedDocument) {
    const expectedDocId = `document:${work.author}:${work.year}:${work.slug}:${doc.slug}`;
    const source = doc.source;
    if (!source) return; // reported by the loader
    if (source.data.document !== expectedDocId) {
      report(
        "error",
        "document/id-mismatch",
        source,
        ["document"],
        `document must be ${expectedDocId} to match the directory`,
      );
    }

    const passages = new Map<string, Passage>(source.data.passages.map((p) => [p.id, p]));
    const active = source.data.passages.filter((p) => p.state === "active");
    const activeIndex = new Map(active.map((p, i) => [p.id, i]));
    const footnoteLabels = new Set(
      active.flatMap((p) => (p.type === "footnote" && p.label ? [p.label] : [])),
    );

    const checkFootnotes = (
      text: string,
      loaded: Loaded<unknown>,
      path: readonly PropertyKey[],
    ) => {
      for (const fn of collectNodes(layoutNodes(text), "fn")) {
        if (!footnoteLabels.has(fn.ref))
          report(
            "error",
            "footnote/unknown-ref",
            loaded,
            path,
            `footnote reference "${fn.ref}" has no footnote with that label`,
          );
      }
    };

    source.data.passages.forEach((p, i) => {
      const expected = passageHash(p.text);
      if (expected !== null && expected !== p.hash) {
        report(
          "error",
          "source/hash-mismatch",
          source,
          ["passages", i, "hash"],
          `hash of ${p.id} does not match its text; source.yml must only be written by plm import`,
        );
      }
      p.derived_from?.forEach((ref, j) => {
        if (!passages.has(ref))
          report(
            "error",
            "source/unknown-derived-from",
            source,
            ["passages", i, "derived_from", j],
            `${p.id} derives from unknown passage ${ref}`,
          );
      });
      if (p.state === "active") {
        checkFootnotes(p.text, source, ["passages", i, "text"]);
        checkLinks(p.text, source, ["passages", i, "text"]);
      }
    });

    for (const [name, file] of doc.renderings) {
      const expectedName = renderingFileName(file.data.language, file.data.register).slice(
        0,
        -".yml".length,
      );
      if (name !== expectedName) {
        report(
          "error",
          "rendering/file-name",
          file,
          ["language"],
          `file must be named ${expectedName}.yml to match language and register`,
        );
      }
      if (file.data.document !== expectedDocId) {
        report(
          "error",
          "document/id-mismatch",
          file,
          ["document"],
          `document must be ${expectedDocId}`,
        );
      }
      const coveredBy = new Map<string, string>();
      for (const [key, r] of Object.entries(file.data.renderings)) {
        const path = ["renderings", key];
        const indexes: number[] = [];
        let coversOk = true;
        r.covers.forEach((id, j) => {
          const p = passages.get(id);
          if (!p) {
            report(
              "error",
              "rendering/unknown-passage",
              file,
              [...path, "covers", j],
              `covers unknown passage ${id}`,
            );
            coversOk = false;
          } else if (p.state !== "active") {
            report(
              "error",
              "rendering/tombstoned-passage",
              file,
              [...path, "covers", j],
              `covers tombstoned passage ${id}`,
            );
            coversOk = false;
          } else {
            indexes.push(activeIndex.get(id) ?? -1);
          }
          const other = coveredBy.get(id);
          if (other)
            report(
              "error",
              "rendering/overlap",
              file,
              [...path, "covers", j],
              `${id} is already covered by rendering ${other}`,
            );
          else coveredBy.set(id, key);
        });
        if (coversOk && indexes.some((idx, j) => j > 0 && idx !== (indexes[j - 1] ?? -2) + 1)) {
          report(
            "error",
            "rendering/not-contiguous",
            file,
            [...path, "covers"],
            "covers must be a contiguous run of active passages in source order",
          );
        }
        if (coversOk) {
          const expected = basedOnHash(r.covers.map((id) => passages.get(id)?.hash ?? ""));
          if (expected !== r.based_on) {
            report(
              "warning",
              "rendering/stale",
              file,
              [...path, "based_on"],
              "stale: the source changed since this rendering was written; review it",
            );
          }
        }
        checkFootnotes(r.text, file, [...path, "text"]);
        checkLinks(r.text, file, [...path, "text"]);
        for (const t of checkTokens(r.text, vocabulary)) {
          report("error", "term/token", file, [...path, "text"], `term token at character ${t.offset}: ${t.message}`);
        }
        for (const extra of options.checkRenderingText?.(r.text, repo) ?? []) {
          report(extra.severity, extra.code, file, [...path, "text"], extra.message);
        }
      }
    }

    const terms = doc.originalTerms;
    if (terms) {
      if (terms.data.document !== expectedDocId)
        report(
          "error",
          "document/id-mismatch",
          terms,
          ["document"],
          `document must be ${expectedDocId}`,
        );
      terms.data.annotations.forEach((a, i) => {
        const path = ["annotations", i];
        if (!repo.terms.has(a.term))
          report(
            "error",
            "annotation/unknown-term",
            terms,
            [...path, "term"],
            `unknown term ${a.term} (no content/vocabulary/${a.term}.yml)`,
          );
        const p = passages.get(a.passage);
        if (!p || p.state !== "active") {
          report(
            "error",
            "annotation/unknown-passage",
            terms,
            [...path, "passage"],
            `${a.passage} is not an active passage`,
          );
          return;
        }
        const found = countWholeWords(plainText(p.text) ?? "", a.match);
        if (found < a.occurrence) {
          report(
            "error",
            "annotation/no-match",
            terms,
            [...path, "match"],
            `"${a.match}" occurs ${found} time(s) in ${a.passage}, not ${a.occurrence}`,
          );
        }
      });
    }

    const explanations = doc.explanations;
    if (explanations) {
      if (explanations.data.document !== expectedDocId)
        report(
          "error",
          "document/id-mismatch",
          explanations,
          ["document"],
          `document must be ${expectedDocId}`,
        );
      for (const [key, e] of Object.entries(explanations.data.explanations)) {
        e.targets.forEach((id, j) => {
          if (passages.get(id)?.state !== "active")
            report(
              "error",
              "explanation/unknown-passage",
              explanations,
              ["explanations", key, "targets", j],
              `${id} is not an active passage`,
            );
        });
        checkFootnotes(e.text, explanations, ["explanations", key, "text"]);
        checkLinks(e.text, explanations, ["explanations", key, "text"]);
        // STYLE §15 applies to explanations as to term cards: short sentences.
        const long = longSentences(plainText(e.text) ?? e.text);
        if (long.length > 0)
          report(
            "warning",
            "explanation/long-sentence",
            explanations,
            ["explanations", key, "text"],
            `${long.length} sentence(s) over ${MAX_SENTENCE_WORDS} words; split them`,
          );
      }
    }

    // "See also" links (task 032 D). The schema checks shapes, self-links and duplicates;
    // here both ends must be active passages that exist.
    const crossrefs = doc.crossrefs;
    if (crossrefs) {
      if (crossrefs.data.document !== expectedDocId)
        report(
          "error",
          "document/id-mismatch",
          crossrefs,
          ["document"],
          `document must be ${expectedDocId}`,
        );
      crossrefs.data.crossrefs.forEach((c, i) => {
        const path = ["crossrefs", i];
        if (passages.get(c.from)?.state !== "active")
          report(
            "error",
            "crossref/unknown-passage",
            crossrefs,
            [...path, "from"],
            `${c.from} is not an active passage of this document`,
          );
        const target = splitPassageRef(c.to);
        const targetPassages = activeByDocument.get(target.document);
        if (!targetPassages) {
          report(
            "error",
            "crossref/unknown-document",
            crossrefs,
            [...path, "to"],
            `no document ${target.document}`,
          );
        } else if (!targetPassages.has(target.passage)) {
          report(
            "error",
            "crossref/unknown-passage",
            crossrefs,
            [...path, "to"],
            `${target.passage} is not an active passage of ${target.document}`,
          );
        } else if (blockedDocuments.has(target.document)) {
          report(
            "warning",
            "crossref/blocked-target",
            crossrefs,
            [...path, "to"],
            `${target.document} belongs to a blocked work; the link is left out of the build`,
          );
        }
      });
    }
  }

  // Passage text by document id, for term-card examples.
  const passageText = new Map<string, Map<string, string>>();
  for (const w of repo.works) {
    for (const d of w.documents.values()) {
      if (!d.source) continue;
      passageText.set(
        d.source.data.document,
        new Map(d.source.data.passages.map((p) => [p.id, plainText(p.text) ?? ""])),
      );
    }
  }
  const squash = (s: string) => s.replace(/\s+/g, " ").trim();

  for (const term of repo.terms.values()) {
    term.data.related?.forEach((slug, i) => {
      if (!repo.terms.has(slug))
        report("error", "term/unknown-related", term, ["related", i], `no term card "${slug}"`);
    });
    const example = term.data.example;
    if (example) {
      const text = passageText.get(example.document)?.get(example.passage);
      if (text === undefined) {
        report(
          "error",
          "term/example-not-found",
          term,
          ["example"],
          `${example.document} has no passage ${example.passage}`,
        );
      } else if (!squash(text).includes(squash(example.text))) {
        report(
          "error",
          "term/example-not-found",
          term,
          ["example", "text"],
          `the example text does not occur in ${example.passage}; quote the passage exactly`,
        );
      }
    }
    // STYLE "Term cards and explanations": short sentences for newcomers and non-native readers.
    const prose: [readonly PropertyKey[], string | undefined][] = [
      [["definition", "short"], term.data.definition.short],
      [["definition", "long"], term.data.definition.long],
      [["not_to_confuse"], term.data.not_to_confuse],
    ];
    if (term.data.senses) {
      term.data.senses.forEach((s, idx) => {
        prose.push([["senses", idx, "short"], s.short]);
        if (s.long) prose.push([["senses", idx, "long"], s.long]);
      });
    }
    for (const [path, text] of prose) {
      const long = text ? longSentences(text) : [];
      if (long.length > 0)
        report(
          "warning",
          "term/long-sentence",
          term,
          path,
          `${long.length} sentence(s) over ${MAX_SENTENCE_WORDS} words; split them (e.g. "${(long[0] ?? "").slice(0, 60)}…")`,
        );
    }
    term.data.scoped_defaults?.forEach((s, i) => {
      const known = s.scope.startsWith("author:")
        ? authors.has(s.scope.slice("author:".length))
        : workIds.has(s.scope);
      if (!known)
        report(
          "warning",
          "term/unknown-scope",
          term,
          ["scoped_defaults", i, "scope"],
          `scope ${s.scope} does not match any work or author yet`,
        );
    });
    term.data.senses?.forEach((s, i) => {
      if (s.scope.startsWith("work:")) {
        if (!workIds.has(s.scope)) {
          report(
            "warning",
            "term/unknown-scope",
            term,
            ["senses", i, "scope"],
            `scope ${s.scope} does not match any work yet`,
          );
        }
      }
    });
  }

  for (const c of repo.collections) {
    const refs = c.data.kind === "collection" ? c.data.documents : c.data.items;
    const field = c.data.kind === "collection" ? "documents" : "items";
    refs.forEach((ref, i) => {
      const known = ref.startsWith("work:") ? workIds.has(ref) : documentIds.has(ref);
      if (!known) report("error", "collection/unknown-ref", c, [field, i], `${ref} does not exist`);
    });
    if (c.data.kind === "reading_path" && c.data.stages) {
      c.data.stages.forEach((stage, sIdx) => {
        stage.items.forEach((ref, i) => {
          const known = ref.startsWith("work:") ? workIds.has(ref) : documentIds.has(ref);
          if (!known)
            report("error", "collection/unknown-ref", c, ["stages", sIdx, "items", i], `${ref} does not exist`);
        });
      });
    }
  }

  return issues;
}

/** Loads and validates a repository rooted at `root`. */
export function validate(root: string, options: ValidateOptions = {}): Issue[] {
  return validateRepository(loadRepository(root), options);
}
