import { z } from "zod";
import { parseLayout } from "../layout/index.ts";
import {
  DocumentId,
  HttpsUrl,
  IsoDate,
  LayoutText,
  PassageId,
  SchemaVersion,
  Sha256,
  Slug,
  checkUnique,
} from "./common.ts";

export const PassageType = z.enum([
  "heading",
  "paragraph",
  "blockquote",
  "list_item",
  "footnote",
  "table",
  "caption",
  /** A section break such as "* * *". */
  "separator",
]);

export const Passage = z
  .strictObject({
    id: PassageId,
    type: PassageType,
    /** Heading level 1–6; only for headings. */
    level: z.number().int().min(1).max(6).optional(),
    /** Footnote label referenced by <fn ref="…"/>; only for footnotes. */
    label: z.string().min(1).optional(),
    text: LayoutText,
    /** sha256 of the normalized plain text (layout markup excluded). */
    hash: Sha256,
    state: z.enum(["active", "tombstoned"]),
    derived_from: z.array(PassageId).optional(),
  })
  .superRefine((p, ctx) => {
    if (p.level !== undefined && p.type !== "heading") {
      ctx.addIssue({
        code: "custom",
        path: ["level"],
        message: "level is only allowed on headings",
      });
    }
    if (p.type === "footnote" && !p.label) {
      ctx.addIssue({ code: "custom", path: ["label"], message: "footnotes need a label" });
    }
    if (p.label !== undefined && p.type !== "footnote") {
      ctx.addIssue({
        code: "custom",
        path: ["label"],
        message: "label is only allowed on footnotes",
      });
    }
    const layout = parseLayout(p.text);
    if (layout.ok) {
      const rows = layout.nodes.filter((n) => n.type === "tr").length;
      const other = layout.nodes.some((n) => n.type !== "tr" && !(n.type === "text" && !n.value.trim()));
      if (p.type === "table" && (rows === 0 || other)) {
        ctx.addIssue({ code: "custom", path: ["text"], message: "table text must consist only of <tr> rows" });
      }
      if (p.type !== "table" && rows > 0) {
        ctx.addIssue({ code: "custom", path: ["text"], message: "<tr> rows are only allowed in table passages" });
      }
    }
    if (p.state === "active" && p.text.trim() === "") {
      ctx.addIssue({ code: "custom", path: ["text"], message: "active passages need text" });
    }
  });
export type Passage = z.infer<typeof Passage>;

export const SourceFile = z
  .strictObject({
    schema_version: SchemaVersion,
    document: DocumentId,
    title: z.string().min(1),
    source: z.strictObject({
      provider: Slug,
      url: HttpsUrl,
      retrieved_at: IsoDate,
      /** The URL actually fetched when it differs from `url`, e.g. a Wayback Machine raw snapshot. */
      via: HttpsUrl.optional(),
      snapshot: z.string().min(1),
      snapshot_hash: Sha256,
      parser: z.strictObject({
        name: Slug,
        version: z.string().regex(/^\d+\.\d+\.\d+$/, "must be semver x.y.z"),
      }),
    }),
    passages: z.array(Passage).min(1),
  })
  .superRefine((file, ctx) => {
    checkUnique(
      file.passages.map((p) => p.id),
      ctx,
      ["passages"],
      "passage id",
    );
    const labels = new Set<string>();
    file.passages.forEach((p, i) => {
      if (p.label === undefined) return;
      if (labels.has(p.label)) {
        ctx.addIssue({
          code: "custom",
          path: ["passages", i, "label"],
          message: `duplicate footnote label "${p.label}"`,
        });
      }
      labels.add(p.label);
    });
  });
export type SourceFile = z.infer<typeof SourceFile>;
