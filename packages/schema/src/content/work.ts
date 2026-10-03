import { z } from "zod";
import { IsoDate, SchemaVersion, Slug, WorkId, checkUnique } from "./common.ts";

/**
 * Rights status of a work (SDD §5.6). UNVERIFIED is what `plm import` writes;
 * it is schema-valid but not publishable. BLOCKED means rights were withdrawn.
 */
export const RightsStatus = z.enum([
  "UNVERIFIED",
  "PUBLIC_DOMAIN",
  "CC_BY",
  "CC_BY_SA",
  "PERMISSION_GRANTED",
  "BLOCKED",
]);
export type RightsStatus = z.infer<typeof RightsStatus>;

export const PUBLISHABLE_RIGHTS: readonly RightsStatus[] = [
  "PUBLIC_DOMAIN",
  "CC_BY",
  "CC_BY_SA",
  "PERMISSION_GRANTED",
];

export const Rights = z
  .strictObject({
    status: RightsStatus,
    license: z.string().min(1).optional(),
    attribution: z.string().min(1),
    permission: z.string().min(1).optional(),
    notes: z.string().optional(),
    verified_by: z.string().min(1).optional(),
    verified_at: IsoDate.optional(),
  })
  .superRefine((rights, ctx) => {
    if (rights.status !== "UNVERIFIED") {
      if (!rights.verified_by)
        ctx.addIssue({
          code: "custom",
          path: ["verified_by"],
          message: "required once rights are verified",
        });
      if (!rights.verified_at)
        ctx.addIssue({
          code: "custom",
          path: ["verified_at"],
          message: "required once rights are verified",
        });
    }
    if (rights.status === "PERMISSION_GRANTED" && !rights.permission) {
      ctx.addIssue({
        code: "custom",
        path: ["permission"],
        message: "record where and how permission was granted",
      });
    }
    if ((rights.status === "CC_BY" || rights.status === "CC_BY_SA") && !rights.license) {
      ctx.addIssue({
        code: "custom",
        path: ["license"],
        message: "name the exact license version",
      });
    }
  });

export const WorkFile = z
  .strictObject({
    schema_version: SchemaVersion,
    id: WorkId,
    title: z.string().min(1),
    authors: z.array(Slug).min(1),
    year: z.number().int(),
    translation: z
      .strictObject({ translator: z.string().min(1), year: z.number().int() })
      .optional(),
    rights: Rights,
    documents: z.array(Slug).min(1),
  })
  .superRefine((work, ctx) => checkUnique(work.documents, ctx, ["documents"], "document"));
export type WorkFile = z.infer<typeof WorkFile>;
