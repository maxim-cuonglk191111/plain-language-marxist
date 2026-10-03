import type { Passage } from "@plm/schema";
import { passageHash } from "./hash.ts";

export type IncomingBlock = { type: Passage["type"]; text: string; level?: number; label?: string };

export type MergeSummary = { kept: number; added: number; tombstoned: number; layoutChanged: number };

const ID_WIDTH = 5;
const idNumber = (id: string) => Number(id.slice(1));
const formatId = (n: number) => `p${String(n).padStart(ID_WIDTH, "0")}`;

function toPassage(block: IncomingBlock, id: string, hash: string): Passage {
  const passage: Passage = { id, type: block.type, text: block.text, hash, state: "active" };
  if (block.level !== undefined) passage.level = block.level;
  if (block.label !== undefined) passage.label = block.label;
  return passage;
}

/** Longest common subsequence of two hash lists, as index pairs. */
function lcs(a: readonly string[], b: readonly string[]): [number, number][] {
  const n = a.length;
  const m = b.length;
  const table = new Uint32Array((n + 1) * (m + 1));
  const at = (i: number, j: number) => table[i * (m + 1) + j] ?? 0;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * (m + 1) + j] = a[i] === b[j] ? at(i + 1, j + 1) + 1 : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }
  const pairs: [number, number][] = [];
  for (let i = 0, j = 0; i < n && j < m; ) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (at(i + 1, j) >= at(i, j + 1)) i++;
    else j++;
  }
  return pairs;
}

/**
 * Turns freshly parsed blocks into passages, keeping identities stable across
 * source updates (SDD §5.2):
 * - a block whose text (hash) is unchanged keeps its passage ID;
 * - a passage whose text disappeared is tombstoned, never deleted or reused;
 * - a new block gets the next free ID, with derived_from pointing at the
 *   passages it replaced in the same position.
 */
export function mergePassages(
  existing: readonly Passage[] | undefined,
  blocks: readonly IncomingBlock[],
): { passages: Passage[]; summary: MergeSummary } {
  const hashed = blocks.map((block) => {
    const hash = passageHash(block.text);
    if (hash === null) throw new Error(`invalid layout markup in parsed block: ${block.text.slice(0, 80)}`);
    return { block, hash };
  });
  const summary: MergeSummary = { kept: 0, added: 0, tombstoned: 0, layoutChanged: 0 };

  if (!existing || existing.length === 0) {
    summary.added = blocks.length;
    return { passages: hashed.map((h, i) => toPassage(h.block, formatId(i + 1), h.hash)), summary };
  }

  let nextId = Math.max(...existing.map((p) => idNumber(p.id))) + 1;
  const active = existing.filter((p) => p.state === "active");
  const pairs = lcs(active.map((p) => p.hash), hashed.map((h) => h.hash));

  const out: Passage[] = [];
  const emitted = new Set<string>();
  const fullIndex = new Map(existing.map((p, i) => [p.id, i]));
  // Keep earlier tombstones in place: emit them just before the next old passage that follows them.
  const flushTombstonesBefore = (limit: number) => {
    existing.forEach((p, i) => {
      if (i < limit && p.state === "tombstoned" && !emitted.has(p.id)) {
        out.push(p);
        emitted.add(p.id);
      }
    });
  };
  const emitOld = (p: Passage) => {
    flushTombstonesBefore(fullIndex.get(p.id) ?? 0);
    emitted.add(p.id);
  };

  let oi = 0;
  let ni = 0;
  for (const [matchOld, matchNew] of [...pairs, [active.length, blocks.length] as [number, number]]) {
    const removed = active.slice(oi, matchOld);
    for (const p of removed) {
      emitOld(p);
      out.push({ ...p, state: "tombstoned" });
      summary.tombstoned++;
    }
    for (; ni < matchNew; ni++) {
      const incoming = hashed[ni];
      if (!incoming) break;
      const passage = toPassage(incoming.block, formatId(nextId++), incoming.hash);
      if (removed.length) passage.derived_from = removed.map((p) => p.id);
      out.push(passage);
      summary.added++;
    }
    const old = active[matchOld];
    const match = hashed[matchNew];
    if (old && match) {
      emitOld(old);
      const updated = toPassage(match.block, old.id, match.hash);
      if (old.derived_from) updated.derived_from = old.derived_from;
      if (updated.text !== old.text || updated.type !== old.type) summary.layoutChanged++;
      out.push(updated);
      summary.kept++;
    }
    oi = matchOld + 1;
    ni = matchNew + 1;
  }
  flushTombstonesBefore(existing.length);
  return { passages: out, summary };
}
