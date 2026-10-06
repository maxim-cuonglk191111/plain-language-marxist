import { z } from "zod";
import { parseLayout } from "../layout/index.ts";

/** The only content schema version this code reads and writes. Bump together with a plm migrate step. */
export const SCHEMA_VERSION = 5;
export const SchemaVersion = z.literal(SCHEMA_VERSION);

export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase kebab-case (a-z, 0-9, -)");

export const WorkId = z
  .string()
  .regex(/^work:[a-z0-9-]+:\d{4}:[a-z0-9-]+$/, "must look like work:{author}:{year}:{slug}");

export const DocumentId = z
  .string()
  .regex(
    /^document:[a-z0-9-]+:\d{4}:[a-z0-9-]+:[a-z0-9-]+$/,
    "must look like document:{author}:{year}:{slug}:{doc}",
  );

/** Document-scoped passage identity. An identity, not a position (SDD §5.2). */
export const PassageId = z.string().regex(/^p\d{5}$/, "must look like p00017");

export const Sha256 = z.string().regex(/^sha256:[0-9a-f]{64}$/, "must be sha256:<64 hex chars>");

export const IsoDate = z.iso.date();

export const HttpsUrl = z.url({ protocol: /^https$/, error: "must be an https:// URL" });

export const GithubHandle = z
  .string()
  .regex(
    /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
    "must be a GitHub username without @",
  );

export const Citation = z.strictObject({
  title: z.string().min(1),
  author: z.string().min(1).optional(),
  publication: z.string().min(1).optional(),
  year: z.number().int().optional(),
  url: HttpsUrl.optional(),
  accessed_at: IsoDate.optional(),
});

/** Text in layout markup v1 (docs/architecture/layout-markup.md). */
export const LayoutText = z.string().superRefine((text, ctx) => {
  const result = parseLayout(text);
  if (!result.ok) {
    ctx.addIssue({
      code: "custom",
      message: `layout markup: ${result.error.message} (at character ${result.error.offset})`,
    });
  }
});

/** Adds an issue for every value that occurs more than once. */
export function checkUnique(
  values: readonly string[],
  ctx: z.RefinementCtx,
  path: PropertyKey[],
  what: string,
): void {
  const seen = new Set<string>();
  values.forEach((value, i) => {
    if (seen.has(value))
      ctx.addIssue({ code: "custom", path: [...path, i], message: `duplicate ${what} "${value}"` });
    seen.add(value);
  });
}
