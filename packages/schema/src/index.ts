// Zod schemas for content files, the static data contract and the API.
// Content schemas are persisted shapes: change them only together with a
// schema_version bump and a plm migrate step (CLAUDE.md).
import { CollectionsEntry } from "./content/collections.ts";
import { CrossRefsFile } from "./content/crossrefs.ts";
import { ExplanationsFile, OriginalTermsFile } from "./content/annotations.ts";
import { GovernanceFile } from "./content/governance.ts";
import { RenderingFile } from "./content/rendering.ts";
import { SourceFile } from "./content/source.ts";
import { TermFile } from "./content/vocabulary.ts";
import { WorkFile } from "./content/work.ts";

export * from "./content/annotations.ts";
export * from "./content/collections.ts";
export * from "./content/common.ts";
export * from "./content/crossrefs.ts";
export * from "./content/governance.ts";
export * from "./content/rendering.ts";
export * from "./content/source.ts";
export * from "./content/vocabulary.ts";
export * from "./content/work.ts";
export * from "./data/v1.ts";
export * from "./layout/index.ts";

/** Every content file schema, keyed by the name used for its exported JSON Schema. */
export const CONTENT_SCHEMAS = {
  work: WorkFile,
  source: SourceFile,
  rendering: RenderingFile,
  "original-terms": OriginalTermsFile,
  explanations: ExplanationsFile,
  crossrefs: CrossRefsFile,
  term: TermFile,
  collection: CollectionsEntry,
  governance: GovernanceFile,
} as const;
