import { z } from "zod";
import { DocumentId, GithubHandle, SchemaVersion, Slug, WorkId, checkUnique } from "./common.ts";

/** content/collections/{id}.yml — e.g. a tradition such as left communism (SDD §5.7). */
export const CollectionFile = z
  .strictObject({
    schema_version: SchemaVersion,
    kind: z.literal("collection"),
    id: Slug,
    title: z.string().min(1),
    description: z.string().min(1),
    documents: z.array(DocumentId),
    maintainers: z.array(GithubHandle),
  })
  .superRefine((c, ctx) => checkUnique(c.documents, ctx, ["documents"], "document"));

/** content/collections/{id}.yml — always presented as "suggested", never "correct". */
export const ReadingPathFile = z.strictObject({
  schema_version: SchemaVersion,
  kind: z.literal("reading_path"),
  id: Slug,
  title: z.string().min(1),
  description: z.string().min(1).optional(),
  items: z.array(z.union([WorkId, DocumentId])).min(1),
  rationale: z.string().min(1),
});

export const CollectionsEntry = z.discriminatedUnion("kind", [CollectionFile, ReadingPathFile]);
export type CollectionsEntry = z.infer<typeof CollectionsEntry>;
