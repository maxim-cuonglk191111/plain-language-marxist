import type { DataDocument, DataTerm, TermFile } from "@plm/schema";
import { parseTokens } from "@plm/terms";

/** The resolver in @plm/terms works on the content shape; rebuild it from the public data shape. */
export function toTermFile(t: DataTerm): TermFile {
  return {
    // A literal, not SCHEMA_VERSION: importing values from @plm/schema would put zod in the
    // client bundle. `satisfies` makes tsc fail here when the schema version changes.
    schema_version: 5 satisfies TermFile["schema_version"],
    term: t.term,
    ...(t.aliases.length ? { aliases: t.aliases } : {}),
    original: t.original,
    definition: { short: t.definition.short },
    ...(t.senses ? { senses: t.senses as unknown as TermFile["senses"] } : {}),
    renderings: Object.fromEntries(
      t.renderings.map((r) => [
        r.key,
        { forms: r.forms, reason: r.reason, ...(r.limitation ? { limitation: r.limitation } : {}) },
      ]),
    ),
    default: t.default,
    ...(t.scoped_defaults.length ? { scoped_defaults: t.scoped_defaults } : {}),
  };
}

/** Every term a document's page needs: original annotations plus tokens in its renderings. */
export function termsUsed(doc: DataDocument): string[] {
  const slugs = new Set<string>();
  for (const p of doc.passages) for (const a of p.annotations) slugs.add(a.term);
  for (const list of Object.values(doc.renderings)) {
    for (const r of list) {
      const parsed = parseTokens(r.text_raw);
      if (parsed.ok) for (const s of parsed.segments) if (s.kind === "term") slugs.add(s.term);
    }
  }
  return [...slugs].sort();
}
