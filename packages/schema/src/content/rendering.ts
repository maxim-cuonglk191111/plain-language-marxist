import { z } from "zod";
import {
  DocumentId,
  LayoutText,
  PassageId,
  SchemaVersion,
  Sha256,
  Slug,
  checkUnique,
} from "./common.ts";

/** One rendering: a contiguous range of passages → modern text (SDD §5.4, D4). */
export const Rendering = z.strictObject({
  covers: z.array(PassageId).min(1),
  /** sha256 over the covered passages' source hashes when this was written. */
  based_on: Sha256,
  revision: z.number().int().min(1),
  ai_assisted: z.boolean(),
  /** Output paragraphs separated by blank lines; layout markup and term tokens allowed. */
  text: LayoutText.refine((t) => t.trim() !== "", "rendering text must not be empty"),
});
export type Rendering = z.infer<typeof Rendering>;

/** File name is `{language}-{register}.yml`, e.g. en-plain.yml. */
export const RenderingFile = z
  .strictObject({
    schema_version: SchemaVersion,
    document: DocumentId,
    language: z.string().regex(/^[a-z]{2,3}$/, "must be an ISO 639 code like en"),
    register: Slug,
    renderings: z.record(PassageId, Rendering),
  })
  .superRefine((file, ctx) => {
    for (const [key, rendering] of Object.entries(file.renderings)) {
      if (rendering.covers[0] !== key) {
        ctx.addIssue({
          code: "custom",
          path: ["renderings", key, "covers"],
          message: `the key must be the first covered passage (expected covers[0] = ${key})`,
        });
      }
      checkUnique(rendering.covers, ctx, ["renderings", key, "covers"], "covered passage");
    }
  });
export type RenderingFile = z.infer<typeof RenderingFile>;
