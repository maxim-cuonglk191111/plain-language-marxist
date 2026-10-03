import type { Rendering, RenderingFile, SourceFile } from "@plm/schema";
import { basedOnHash } from "./hash.ts";

export type ProposedRendering = { covers: string[]; text: string };

/**
 * Merges proposed renderings into a document's rendering file (SDD §5.4):
 * existing renderings that overlap a proposal are replaced, the revision
 * continues from the highest replaced one, based_on is recomputed from the
 * current source, and entries are ordered by source position.
 */
export function applyRenderings(
  existing: RenderingFile | undefined,
  proposals: readonly ProposedRendering[],
  source: SourceFile,
  options: { language: string; register: string; aiAssisted: boolean },
): { file: RenderingFile; replaced: string[] } {
  const hashes = new Map(source.passages.map((p) => [p.id, p.hash]));
  const order = new Map(source.passages.map((p, i) => [p.id, i]));
  const renderings = new Map<string, Rendering>(Object.entries(existing?.renderings ?? {}));
  const replaced: string[] = [];

  for (const proposal of proposals) {
    let revision = 0;
    for (const [key, r] of [...renderings]) {
      if (r.covers.some((id) => proposal.covers.includes(id))) {
        revision = Math.max(revision, r.revision);
        replaced.push(key);
        renderings.delete(key);
      }
    }
    const key = proposal.covers[0];
    if (!key) continue;
    // Multi-paragraph text is written as a literal block, which always ends with a newline.
    const multiline = proposal.text.includes("\n");
    renderings.set(key, {
      covers: [...proposal.covers],
      based_on: basedOnHash(proposal.covers.map((id) => hashes.get(id) ?? "")),
      revision: revision + 1,
      ai_assisted: options.aiAssisted,
      text: multiline && !proposal.text.endsWith("\n") ? `${proposal.text}\n` : proposal.text,
    });
  }

  const sorted = Object.fromEntries(
    [...renderings].sort(([a], [b]) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity)),
  );
  return {
    file: {
      schema_version: 1,
      document: source.document,
      language: options.language,
      register: options.register,
      renderings: sorted,
    },
    replaced,
  };
}
