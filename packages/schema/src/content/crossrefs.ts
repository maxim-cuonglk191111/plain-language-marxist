import { z } from "zod";
import { DocumentId, PassageId, SchemaVersion } from "./common.ts";

/**
 * What the target passage does in relation to the `from` passage. Each kind
 * states a factual connection, never an interpretation (docs/editorial/STYLE.md
 * "Cross-references"; anything interpretive goes in the Context layer, SDD §8.6).
 */
export const CrossRefKind = z.enum(["revises", "explains", "same-argument", "quotes"]);
export type CrossRefKind = z.infer<typeof CrossRefKind>;

/** `<document id>#<passage id>`, e.g. document:marx:1848:communist-manifesto:ch01#p00063. */
export const PassageRef = z
  .string()
  .regex(
    /^document:[a-z0-9-]+:\d{4}:[a-z0-9-]+:[a-z0-9-]+#p\d{5}$/,
    "must look like document:{author}:{year}:{slug}:{doc}#p00017",
  );

/** Splits a PassageRef into its document id and passage id. */
export function splitPassageRef(ref: string): { document: string; passage: string } {
  const at = ref.lastIndexOf("#");
  return { document: ref.slice(0, at), passage: ref.slice(at + 1) };
}

export const CrossRef = z.strictObject({
  /** A passage of this document. */
  from: PassageId,
  /** The passage it points to, in this or another document. */
  to: PassageRef,
  kind: CrossRefKind,
  /** A short factual note, e.g. "Engels' footnote to the 1888 English edition." */
  note: z.string().min(1).max(200).optional(),
});
export type CrossRef = z.infer<typeof CrossRef>;

/** crossrefs.yml — "See also" links from this document's passages (task 032 D). */
export const CrossRefsFile = z
  .strictObject({
    schema_version: SchemaVersion,
    document: DocumentId,
    crossrefs: z.array(CrossRef).min(1),
  })
  .superRefine((file, ctx) => {
    const seen = new Set<string>();
    file.crossrefs.forEach((c, i) => {
      if (c.to === `${file.document}#${c.from}`)
        ctx.addIssue({
          code: "custom",
          path: ["crossrefs", i, "to"],
          message: `${c.from} cannot refer to itself`,
        });
      const key = `${c.from} ${c.to}`;
      if (seen.has(key))
        ctx.addIssue({
          code: "custom",
          path: ["crossrefs", i],
          message: `duplicate cross-reference from ${c.from} to ${c.to}`,
        });
      seen.add(key);
    });
  });
export type CrossRefsFile = z.infer<typeof CrossRefsFile>;
