import type { DataDocument } from "@plm/schema";

type Passage = DataDocument["passages"][number];
type Rendering = DataDocument["renderings"][string][number];

/**
 * One aligned row of the reader: the original passages a rendering covers,
 * next to that rendering (or none yet). Rows keep Original and Plain English
 * lined up in Parallel mode without any scroll syncing (SDD §12).
 */
export type Row = { ids: string[]; originals: Passage[]; rendering: Rendering | null };

export function buildRows(doc: DataDocument, renderingKey: string): Row[] {
  const renderings = doc.renderings[renderingKey] ?? [];
  const byPassage = new Map<string, Rendering>();
  for (const r of renderings) for (const id of r.covers) byPassage.set(id, r);
  const byId = new Map(doc.passages.map((p) => [p.id, p]));

  const rows: Row[] = [];
  for (const passage of doc.passages) {
    const rendering = byPassage.get(passage.id);
    if (!rendering) {
      rows.push({ ids: [passage.id], originals: [passage], rendering: null });
    } else if (rendering.covers[0] === passage.id) {
      const originals = rendering.covers.flatMap((id) => byId.get(id) ?? []);
      rows.push({ ids: rendering.covers, originals, rendering });
    }
  }
  return rows;
}

/** Footnote label → the id of the footnote passage, for <fn ref> links. */
export function footnoteTargets(doc: DataDocument): Map<string, string> {
  return new Map(
    doc.passages.flatMap((p) =>
      p.type === "footnote" && p.label ? [[p.label, p.id] as const] : [],
    ),
  );
}
