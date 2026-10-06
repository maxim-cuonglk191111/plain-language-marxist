import { z } from "zod";
import { Citation, DocumentId, PassageId, SchemaVersion, Slug, WorkId } from "./common.ts";

/** Form names a term can declare, e.g. sg, pl, adj. */
const FormName = z.string().regex(/^[a-z]+$/, "form names are lowercase letters, e.g. sg, pl, adj");
const Forms = z.record(FormName, z.string().min(1));

export const TermScope = z.union([
  WorkId,
  z.string().regex(/^author:[a-z0-9-]+$/, "must be author:{slug}"),
  z.string().regex(/^period:\d{4}(-\d{4})?$/, "must be period:YYYY or period:YYYY-YYYY"),
  z.string().regex(/^movement:[a-z0-9-]+$/, "must be movement:{slug}"),
]);

export const SenseCitation = z.strictObject({
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int(),
  publication: z.string().min(1).optional(),
  url: Citation.shape.url,
  accessed_at: Citation.shape.accessed_at,
});
export type SenseCitation = z.infer<typeof SenseCitation>;

export const TermSense = z.strictObject({
  scope: TermScope,
  short: z.string().min(1),
  long: z.string().min(1).optional(),
  sources: z.array(SenseCitation).min(1, "every sense must cite at least one historical source"),
});
export type TermSense = z.infer<typeof TermSense>;

/** content/vocabulary/{term}.yml (SDD §6.1). */
export const TermFile = z
  .strictObject({
    schema_version: SchemaVersion,
    term: Slug,
    aliases: z.array(z.string().min(1)).optional(),
    /** Declares the term's forms; every rendering must supply exactly these. */
    original: Forms,
    definition: z.strictObject({
      short: z.string().min(1),
      /** Paragraphs separated by a blank line. */
      long: z.string().min(1).optional(),
      sources: z.array(Citation).optional(),
    }),
    /** Scoped senses by author, period, or revolutionary current (task 034, v5). */
    senses: z.array(TermSense).optional(),
    /** A sentence from a work showing the term in use; `text` must occur in that passage (v2). */
    example: z
      .strictObject({ document: DocumentId, passage: PassageId, text: z.string().min(1) })
      .optional(),
    /** The everyday meaning a reader should not confuse the term with (v2). */
    not_to_confuse: z.string().min(1).optional(),
    /** Slugs of related term cards, shown as links (v2). */
    related: z.array(Slug).optional(),
    renderings: z.record(
      Slug,
      z.strictObject({
        forms: Forms,
        reason: z.string().min(1),
        limitation: z.string().min(1).optional(),
      }),
    ),
    default: Slug,
    scoped_defaults: z.array(z.strictObject({ scope: TermScope, rendering: Slug })).optional(),
  })
  .superRefine((term, ctx) => {
    const declared = Object.keys(term.original).sort();
    if (declared.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["original"],
        message: "declare at least one form (e.g. sg)",
      });
    }
    for (const [name, rendering] of Object.entries(term.renderings)) {
      const supplied = Object.keys(rendering.forms).sort();
      const missing = declared.filter((f) => !supplied.includes(f));
      const extra = supplied.filter((f) => !declared.includes(f));
      if (missing.length || extra.length) {
        ctx.addIssue({
          code: "custom",
          path: ["renderings", name, "forms"],
          message:
            `forms must match the declared forms [${declared.join(", ")}]` +
            (missing.length ? `; missing ${missing.join(", ")}` : "") +
            (extra.length ? `; undeclared ${extra.join(", ")}` : ""),
        });
      }
    }
    if (term.related?.includes(term.term)) {
      ctx.addIssue({ code: "custom", path: ["related"], message: "a term cannot be related to itself" });
    }
    if (!(term.default in term.renderings)) {
      ctx.addIssue({
        code: "custom",
        path: ["default"],
        message: `"${term.default}" is not one of the renderings`,
      });
    }
    term.scoped_defaults?.forEach((scoped, i) => {
      if (!(scoped.rendering in term.renderings)) {
        ctx.addIssue({
          code: "custom",
          path: ["scoped_defaults", i, "rendering"],
          message: `"${scoped.rendering}" is not one of the renderings`,
        });
      }
    });
    term.senses?.forEach((sense, idx) => {
      const sentences = sense.short.split(/(?<=[.!?])\s+/).filter(Boolean);
      for (const s of sentences) {
        const words = s.trim().split(/\s+/).filter(Boolean).length;
        if (words > 25) {
          ctx.addIssue({
            code: "custom",
            path: ["senses", idx, "short"],
            message: `sentence in sense short definition exceeds 25 words (${words} words)`,
          });
        }
      }
    });
  });
export type TermFile = z.infer<typeof TermFile>;
