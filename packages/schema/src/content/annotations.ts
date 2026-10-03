import { z } from "zod";
import { Citation, DocumentId, LayoutText, PassageId, SchemaVersion, Slug } from "./common.ts";

/** original-terms.yml — term annotations on the original, anchored to text (SDD §5.5). */
export const OriginalTermsFile = z.strictObject({
  schema_version: SchemaVersion,
  document: DocumentId,
  annotations: z.array(
    z.strictObject({
      passage: PassageId,
      term: Slug,
      match: z.string().min(1),
      occurrence: z.number().int().min(1),
    }),
  ),
});
export type OriginalTermsFile = z.infer<typeof OriginalTermsFile>;

export const ExplanationKind = z.enum([
  "explanation",
  "historical_context",
  "interpretation",
  "commentary",
  "translation_note",
]);

export const Explanation = z.strictObject({
  kind: ExplanationKind,
  targets: z.array(PassageId).min(1),
  text: LayoutText,
  sources: z.array(Citation).optional(),
  ai_assisted: z.boolean(),
});

/** explanations.yml (SDD §5.7). */
export const ExplanationsFile = z.strictObject({
  schema_version: SchemaVersion,
  document: DocumentId,
  explanations: z.record(z.string().regex(/^e\d{3,}$/, "must look like e001"), Explanation),
});
export type ExplanationsFile = z.infer<typeof ExplanationsFile>;
