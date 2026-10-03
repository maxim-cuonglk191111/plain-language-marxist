import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  ORIGINAL_TERMS_FILE,
  annotatePassages,
  loadRepository,
  parseContent,
  stringifyContent,
} from "@plm/content";
import { OriginalTermsFile } from "@plm/schema";

/** plm annotate <document-dir>: add missing term annotations to original-terms.yml. */
export function runAnnotate(documentDir: string, root: string): number {
  const repoRoot = resolve(root);
  const dir = relative(repoRoot, resolve(documentDir)).replace(/\\/g, "/");
  const repo = loadRepository(repoRoot);
  const doc = repo.works.flatMap((w) => [...w.documents.values()]).find((d) => d.dir === dir);
  if (!doc?.source) {
    console.error(`No document with a valid source.yml at ${dir}`);
    return 1;
  }
  const file = `${dir}/${ORIGINAL_TERMS_FILE}`;
  let existing: OriginalTermsFile["annotations"] = [];
  if (existsSync(join(repoRoot, file))) {
    const parsed = parseContent(readFileSync(join(repoRoot, file), "utf8"), OriginalTermsFile);
    if (!parsed.ok) {
      console.error(`${file} is invalid; fix it first (plm validate)`);
      return 1;
    }
    existing = parsed.data.annotations;
  }
  const terms = [...repo.terms.values()].map((t) => t.data);
  const { annotations, added } = annotatePassages(doc.source.data.passages, terms, existing);
  writeFileSync(
    join(repoRoot, file),
    stringifyContent(OriginalTermsFile, {
      schema_version: 1,
      document: doc.source.data.document,
      annotations,
    }),
  );
  console.log(
    `${file}: ${added} annotation(s) added, ${annotations.length} in total, from ${terms.length} term(s).`,
  );
  return 0;
}
