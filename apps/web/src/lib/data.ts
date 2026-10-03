// Build-time access to the static data contract (dist/data/v1, from `plm build`).
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { DataDocument, DataIndex, DataTerm } from "@plm/schema";

const dataDir = () => process.env.PLM_DATA_DIR ?? resolve(process.cwd(), "../../dist/data/v1");
const read = (path: string): unknown => JSON.parse(readFileSync(join(dataDir(), path), "utf8"));

let index: DataIndex | undefined;
export function getIndex(): DataIndex {
  index ??= DataIndex.parse(read("index.json"));
  return index;
}

export type DocumentEntry = DataIndex["works"][number]["documents"][number] & {
  work: DataIndex["works"][number];
};

export function allDocuments(): DocumentEntry[] {
  return getIndex().works.flatMap((work) => work.documents.map((d) => ({ ...d, work })));
}

export function findDocument(path: string): DocumentEntry | undefined {
  return allDocuments().find((d) => d.path === path);
}

export function getDocument(entry: DocumentEntry): DataDocument {
  return DataDocument.parse(read(entry.data));
}

export function getTerm(slug: string): DataTerm {
  return DataTerm.parse(read(`terms/${slug}.json`));
}

export const siteUrl = () => process.env.PLM_SITE_URL ?? "http://localhost:3000";
