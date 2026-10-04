"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { describe, locate } from "../lib/anchor";
import {
  COLORS,
  bookmarkId,
  newId,
  readAnnotations,
  saveAnnotations,
  type Annotation,
  type Color,
  type MarkLayer,
} from "../lib/annotations";
import { withSource, type CitationMeta } from "../lib/citation";
import type { ChapterMeta } from "../lib/history";
import { currentLayers } from "../lib/layers";
import { fromRange, layerText, toRange } from "../lib/layertext";
import { readerRows, rowAtLine } from "../lib/position";
import { canSpeak } from "../lib/speech";
import { LISTEN_EVENT } from "./ReadAloud";
import { onShortcut } from "./Shortcuts";

export const TOAST_EVENT = "plm:toast";
export const toast = (message: string) =>
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));

const COLOR_NAME: Record<Color, string> = {
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
  pink: "Pink",
};
const LAYER_NAME: Record<MarkLayer, string> = { plain: "Plain English", original: "Original" };
const CELL = { plain: ".col-plain", original: ".col-original" } as const;

type Highlights = Map<string, unknown>;
const registry = () => (globalThis.CSS as unknown as { highlights?: Highlights })?.highlights;
const HighlightCtor = () =>
  (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;

/** A text selection inside one layer cell, or an existing text mark opened for editing. */
type TextTarget = {
  passage: string;
  layer: MarkLayer;
  start: number;
  end: number;
  /** What the reader sees (current term wording), for copying. */
  shown: string;
  /** Canonical text of the cell, for the quote. */
  cellText: string;
  markId?: string;
  top: number;
  left: number;
};

const rowOf = (id: string) => document.getElementById(id)?.closest<HTMLElement>(".row") ?? null;

/** Visible words of one layer of a passage, paragraph by paragraph. */
function passageText(passage: string, layer: MarkLayer): string {
  const cell = rowOf(passage)?.querySelector(CELL[layer]);
  if (!cell) return "";
  const blocks = [...cell.querySelectorAll<HTMLElement>(".block")];
  return blocks
    .map((b) => b.innerText.trim())
    .filter(Boolean)
    .join("\n\n");
}

function snippetOf(passage: string): string {
  const row = rowOf(passage);
  const block =
    row?.querySelector(".layer-plain .block") ?? row?.querySelector(".layer-original .block");
  return (block?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 160);
}

/**
 * Highlights, notes, bookmarks and quoting (task 031 D), like a study Bible app:
 * tap a passage (or use its ⋯ button) for the passage actions, or select words
 * in Plain English or the Original for a highlight. Everything is stored in this
 * browser (plm:annotations). Text highlights are drawn with the CSS Custom
 * Highlight API, so the page's markup never changes.
 */
export function Annotations({
  path,
  meta,
  cite,
}: {
  path: string;
  meta: ChapterMeta;
  cite: CitationMeta;
}) {
  const [items, setItems] = useState<Annotation[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState<TextTarget | null>(null);
  /** The note being written: on existing items (ids), or on new marks created only when saved. */
  const [noteFor, setNoteFor] = useState<{
    ids: string[];
    create: Annotation[];
    draft: string;
  } | null>(null);
  const [compare, setCompare] = useState<string | null>(null);
  const [speech, setSpeech] = useState(false);
  useEffect(() => setSpeech(canSpeak()), []);
  const bar = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const noteDialog = useRef<HTMLDialogElement>(null);
  const compareDialog = useRef<HTMLDialogElement>(null);

  const mine = useCallback((all: Annotation[]) => all.filter((a) => a.path === path), [path]);
  const load = useCallback(() => setItems(mine(readAnnotations().items)), [mine]);
  /** Apply a change to this chapter's items, keeping every other chapter's. */
  const commit = useCallback(
    (change: (list: Annotation[]) => Annotation[]) => {
      const store = readAnnotations();
      const others = store.items.filter((a) => a.path !== path);
      const next = change(store.items.filter((a) => a.path === path));
      saveAnnotations({ v: 1, items: [...others, ...next] });
      setItems(next);
    },
    [path],
  );

  useEffect(load, [load]);

  // Highlight colours. Styled here, not in globals.css: the CSS build cannot parse ::highlight() yet.
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent =
      COLORS.map(
        (c) => `::highlight(hl-${c}){background-color:var(--mark-${c});color:inherit}`,
      ).join("") +
      "::highlight(hl-note){text-decoration:underline dotted var(--accent);text-decoration-thickness:2px}";
    document.head.append(style);
    return () => style.remove();
  }, []);

  // ---------- Painting: passage marks as row attributes, text marks as highlights ----------
  const paint = useCallback(() => {
    const rows = document.querySelectorAll<HTMLElement>(".rows > .row");
    rows.forEach((r) => {
      delete r.dataset["mark"];
      delete r.dataset["note"];
      delete r.dataset["bookmarked"];
      delete r.dataset["textMark"];
    });
    const ranges: Record<string, Range[]> = {};
    const orphanChanges = new Map<string, boolean>();
    const models = new Map<Element, ReturnType<typeof layerText>>();
    for (const a of items) {
      const row = rowOf(a.passage);
      if (!row) continue;
      if (a.kind === "bookmark") row.dataset["bookmarked"] = "1";
      else if (a.scope === "passage") {
        if (a.color) row.dataset["mark"] = a.color;
        if (a.note) row.dataset["note"] = "1";
      } else if (a.quote && a.layer) {
        const cell = row.querySelector(CELL[a.layer]);
        if (!cell) continue;
        const model = models.get(cell) ?? layerText(cell);
        models.set(cell, model);
        const at = locate(model.text, a.quote);
        if (Boolean(a.orphaned) !== !at) orphanChanges.set(a.id, !at);
        const range = at && toRange(model, at.start, at.end);
        if (!range) continue;
        (ranges[a.color ?? "note"] ??= []).push(range);
        if (a.note) row.dataset["note"] = "1";
        row.dataset["textMark"] = a.color ?? "note";
      }
    }
    const reg = registry();
    const Ctor = HighlightCtor();
    if (reg && Ctor) {
      for (const c of [...COLORS, "note"]) {
        const list = ranges[c] ?? [];
        if (list.length) reg.set(`hl-${c}`, new Ctor(...list));
        else reg.delete(`hl-${c}`);
      }
      document.documentElement.dataset["highlightApi"] = "1";
    }
    if (orphanChanges.size)
      commit((list) =>
        list.map((a) => {
          const orphaned = orphanChanges.get(a.id);
          if (orphaned === undefined) return a;
          const { orphaned: _old, ...rest } = a;
          void _old;
          return orphaned ? { ...rest, orphaned: true } : rest;
        }),
      );
  }, [items, commit]);

  useEffect(() => {
    paint();
    // Term wording swaps replace text nodes, which collapses the ranges: repaint.
    const root = document.querySelector(".rows");
    let timer: number | undefined;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(paint, 50);
    });
    if (root) observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [paint]);

  useEffect(() => {
    document.querySelectorAll<HTMLElement>(".rows > .row").forEach((r) => {
      if (selected.includes(r.id)) r.dataset["selected"] = "1";
      else delete r.dataset["selected"];
    });
  }, [selected]);

  // ---------- Reveal the ⋯ buttons; tapping a passage selects it ----------
  useEffect(() => {
    const buttons = [...document.querySelectorAll<HTMLButtonElement>("button.row-actions")];
    const onButton = (e: Event) => {
      const b = e.currentTarget as HTMLButtonElement;
      opener.current = b;
      const id = b.dataset["passage"] ?? "";
      setText(null);
      setSelected((s) => (s.includes(id) ? s : [...s, id]));
      // Move into the bar once it has rendered.
      window.setTimeout(() => bar.current?.querySelector("button")?.focus(), 0);
    };
    for (const b of buttons) {
      b.hidden = false;
      b.addEventListener("click", onButton);
    }
    const rows = document.querySelector(".rows");
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, summary, details, input, textarea, .row-tools")) return;
      if (!document.getSelection()?.isCollapsed) return;
      const row = target.closest<HTMLElement>(".rows > .row");
      if (!row) return;
      // A tap on an existing text highlight opens it for editing.
      const hit = textMarkAt(e as MouseEvent);
      if (hit) {
        setSelected([]);
        setText(hit);
        return;
      }
      setText(null);
      setSelected((s) => (s.includes(row.id) ? s.filter((x) => x !== row.id) : [...s, row.id]));
    };
    rows?.addEventListener("click", onClick);
    return () => {
      buttons.forEach((b) => b.removeEventListener("click", onButton));
      rows?.removeEventListener("click", onClick);
    };
  });

  /** The text mark under a click, if any (caret position from the pointer). */
  const textMarkAt = (e: MouseEvent): TextTarget | null => {
    const doc = document as Document & {
      caretPositionFromPoint?: (
        x: number,
        y: number,
      ) => { offsetNode: Node; offset: number } | null;
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
    };
    const pos = doc.caretPositionFromPoint?.(e.clientX, e.clientY);
    const caret = pos
      ? { node: pos.offsetNode, offset: pos.offset }
      : (() => {
          const r = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
          return r ? { node: r.startContainer, offset: r.startOffset } : null;
        })();
    if (!caret) return null;
    const el = caret.node instanceof Element ? caret.node : caret.node.parentElement;
    const cell = el?.closest(".col-plain, .col-original");
    const row = cell?.closest<HTMLElement>(".row");
    if (!cell || !row) return null;
    const layer: MarkLayer = cell.matches(".col-plain") ? "plain" : "original";
    const model = layerText(cell);
    const range = document.createRange();
    range.setStart(caret.node, caret.offset);
    const { start: at } = fromRange(model, range);
    for (const a of items) {
      if (a.scope !== "text" || a.passage !== row.id || a.layer !== layer || !a.quote) continue;
      const found = locate(model.text, a.quote);
      if (found && at >= found.start && at <= found.end) {
        const r = toRange(model, found.start, found.end);
        const box = r?.getBoundingClientRect();
        return {
          passage: row.id,
          layer,
          start: found.start,
          end: found.end,
          shown: r?.toString() ?? a.quote.exact,
          cellText: model.text,
          markId: a.id,
          top: (box?.bottom ?? e.clientY) + window.scrollY + 8,
          left: (box?.left ?? e.clientX) + window.scrollX,
        };
      }
    }
    return null;
  };

  // ---------- Text selection → toolbar ----------
  const readSelection = useCallback((): TextTarget | null => {
    const sel = document.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const node = range.commonAncestorContainer;
    const el = node instanceof Element ? node : node.parentElement;
    const cell = el?.closest(".rows .col-plain, .rows .col-original");
    const row = cell?.closest<HTMLElement>(".row");
    if (!cell || !row) return null;
    const model = layerText(cell);
    let { start, end } = fromRange(model, range);
    while (start < end && /\s/.test(model.text[start] ?? "")) start++;
    while (end > start && /\s/.test(model.text[end - 1] ?? "")) end--;
    if (end <= start) return null;
    const box = range.getBoundingClientRect();
    return {
      passage: row.id,
      layer: cell.matches(".col-plain") ? "plain" : "original",
      start,
      end,
      shown: sel.toString().trim(),
      cellText: model.text,
      top: box.bottom + window.scrollY + 8,
      left: box.left + window.scrollX,
    };
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const t = readSelection();
        if (t) {
          setSelected([]);
          setText(t);
        } else setText((cur) => (cur?.markId ? cur : null));
      }, 250);
    };
    document.addEventListener("selectionchange", onChange);
    // Words may already be selected when the page finishes loading.
    onChange();
    return () => {
      document.removeEventListener("selectionchange", onChange);
      window.clearTimeout(timer);
    };
  }, [readSelection]);

  // ---------- Actions ----------
  const url = (passage: string) => `${location.origin}${path}#${passage}`;
  const base = (passage: string) => ({ path, title: meta.title, work: meta.work, passage });

  const textMark = (t: TextTarget, color?: Color): Annotation => {
    const now = Date.now();
    return {
      id: newId(),
      kind: "mark",
      scope: "text",
      ...base(t.passage),
      layer: t.layer,
      quote: describe(t.cellText, t.start, t.end),
      ...(color ? { color } : {}),
      snippet: t.shown.slice(0, 200),
      created: now,
      updated: now,
    };
  };
  const markText = (t: TextTarget, color: Color) => {
    const id = t.markId;
    commit((list) =>
      id
        ? list.map((a) => (a.id === id ? { ...a, color, updated: Date.now() } : a))
        : [...list, textMark(t, color)],
    );
    document.getSelection()?.removeAllRanges();
    setText(null);
  };

  const markPassages = (color: Color | null) => {
    const now = Date.now();
    commit((list) => {
      let next = list;
      for (const p of selected) {
        const existing = next.find(
          (a) => a.scope === "passage" && a.kind === "mark" && a.passage === p,
        );
        if (existing) {
          const updatedItem = { ...existing, updated: now } as Annotation;
          if (color) updatedItem.color = color;
          else delete updatedItem.color;
          next =
            !updatedItem.color && !updatedItem.note
              ? next.filter((a) => a !== existing)
              : next.map((a) => (a === existing ? updatedItem : a));
        } else if (color) {
          next = [
            ...next,
            {
              id: newId(),
              kind: "mark",
              scope: "passage",
              ...base(p),
              color,
              snippet: snippetOf(p),
              created: now,
              updated: now,
            },
          ];
        }
      }
      return next;
    });
  };

  const bookmarked =
    selected.length > 0 && selected.every((p) => items.some((a) => a.id === bookmarkId(path, p)));
  const toggleBookmarks = () => {
    const now = Date.now();
    commit((list) =>
      bookmarked
        ? list.filter((a) => !selected.some((p) => a.id === bookmarkId(path, p)))
        : [
            ...list,
            ...selected
              .filter((p) => !list.some((a) => a.id === bookmarkId(path, p)))
              .map((p): Annotation => ({
                id: bookmarkId(path, p),
                kind: "bookmark",
                scope: "passage",
                ...base(p),
                snippet: snippetOf(p),
                created: now,
                updated: now,
              })),
          ],
    );
    toast(bookmarked ? "Bookmark removed." : "Bookmarked. Find it under Notes.");
  };

  const copy = async (text: string, done: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(done);
    } catch {
      toast("Copying is not available in this browser.");
    }
  };
  const copyPassages = (layer: MarkLayer) => {
    const ordered = [...selected].sort();
    const words = ordered
      .map((p) => passageText(p, layer))
      .filter(Boolean)
      .join("\n\n");
    void copy(
      withSource(words, cite, layer, url(ordered[0] ?? "")),
      `Copied with its source (${LAYER_NAME[layer]}).`,
    );
  };
  const share = async (text: string, passage: string) => {
    const link = url(passage);
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ title: `${meta.work}: ${meta.title}`, text, url: link });
        return;
      } catch (e) {
        if ((e as DOMException).name === "AbortError") return;
      }
    }
    void copy(link, "Link copied.");
  };

  const openNote = (ids: string[], create: Annotation[] = []) => {
    const current = items.find((a) => ids.includes(a.id))?.note ?? "";
    setNoteFor({ ids, create, draft: current });
  };
  /** Note on the selected passages: on each passage mark, made when the note is saved. */
  const notePassages = () => {
    const now = Date.now();
    const ids: string[] = [];
    const create: Annotation[] = [];
    for (const p of selected) {
      const existing = items.find(
        (a) => a.scope === "passage" && a.kind === "mark" && a.passage === p,
      );
      if (existing) ids.push(existing.id);
      else
        create.push({
          id: newId(),
          kind: "mark",
          scope: "passage",
          ...base(p),
          snippet: snippetOf(p),
          created: now,
          updated: now,
        });
    }
    openNote(ids, create);
  };
  /** Save the draft (null deletes the note). A mark left with no colour and no note goes. */
  const saveNote = (note: string | null) => {
    if (!noteFor) return;
    const now = Date.now();
    const text = note?.trim() ?? "";
    const withNote = (a: Annotation): Annotation[] => {
      const next = { ...a, updated: now };
      if (text) next.note = text;
      else delete next.note;
      return next.kind === "mark" && !next.color && !next.note ? [] : [next];
    };
    commit((list) => [
      ...list.flatMap((a) => (noteFor.ids.includes(a.id) ? withNote(a) : [a])),
      ...noteFor.create.flatMap(withNote),
    ]);
    setNoteFor(null);
    if (text) toast("Note saved.");
  };
  const deleteText = (id: string) => {
    commit((list) => list.filter((a) => a.id !== id));
    setText(null);
  };

  useEffect(() => {
    const d = noteDialog.current;
    if (noteFor && d && !d.open) d.showModal();
    if (!noteFor && d?.open) d.close();
  }, [noteFor]);
  useEffect(() => {
    const d = compareDialog.current;
    if (compare && d && !d.open) d.showModal();
    if (!compare && d?.open) d.close();
  }, [compare]);

  // Escape closes the bar or toolbar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (selected.length || text) && !noteFor && !compare) {
        setSelected([]);
        setText(null);
        opener.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  // "h" highlights the selected words; "b" bookmarks the passage at the reading line.
  useEffect(() => {
    const offH = onShortcut("highlight", () => {
      const t = readSelection();
      if (!t) return toast("Select some words first, then press h.");
      markText(t, "yellow");
      toast("Highlighted.");
    });
    const offB = onShortcut("bookmark", () => {
      const rows = readerRows();
      const row = rows[rowAtLine(rows).index];
      if (!row) return;
      const id = bookmarkId(path, row.id);
      const on = items.some((a) => a.id === id);
      const now = Date.now();
      commit((list) =>
        on
          ? list.filter((a) => a.id !== id)
          : [
              ...list,
              {
                id,
                kind: "bookmark",
                scope: "passage",
                ...base(row.id),
                snippet: snippetOf(row.id),
                created: now,
                updated: now,
              },
            ],
      );
      toast(on ? "Bookmark removed." : `Passage ${Number(row.id.replace(/D/g, ""))} bookmarked.`);
    });
    return () => {
      offH();
      offB();
    };
  });

  // Only while the bar is open: the layers live on <html>, which the server render has not got.
  const visible = selected.length > 0 ? currentLayers() : [];
  const copyLayers: MarkLayer[] = (["plain", "original"] as const).filter((l) =>
    visible.includes(l),
  );
  const editing = text?.markId ? items.find((a) => a.id === text.markId) : undefined;
  const passageMark =
    selected.length === 1
      ? items.find((a) => a.scope === "passage" && a.kind === "mark" && a.passage === selected[0])
      : undefined;
  const keep = (e: ReactPointerEvent) => e.preventDefault(); // keep the text selection

  return (
    <>
      {text && (
        <div
          className="text-toolbar"
          role="toolbar"
          aria-label={editing ? "Highlight" : "Selected words"}
          style={{ top: text.top, left: Math.max(8, Math.min(text.left, window.innerWidth - 300)) }}
          onPointerDown={keep}
        >
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`swatch swatch-${c}`}
              aria-label={`Highlight ${COLOR_NAME[c]}`}
              aria-pressed={editing ? editing.color === c : undefined}
              onClick={() => markText(text, c)}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              if (editing) openNote([editing.id]);
              else openNote([], [textMark(text)]);
              document.getSelection()?.removeAllRanges();
              setText(null);
            }}
          >
            Note
          </button>
          <button
            type="button"
            onClick={() =>
              void copy(
                withSource(text.shown, cite, text.layer, url(text.passage)),
                "Copied with its source.",
              )
            }
          >
            Copy with source
          </button>
          <button
            type="button"
            onClick={() => void share(withSource(text.shown, cite, text.layer, ""), text.passage)}
          >
            Share
          </button>
          {editing && (
            <button type="button" onClick={() => deleteText(editing.id)}>
              Delete
            </button>
          )}
        </div>
      )}

      {selected.length > 0 && (
        <div ref={bar} className="passage-bar" role="toolbar" aria-label="Passage actions">
          <p className="passage-bar-title">
            {selected.length === 1
              ? `Passage ${Number((selected[0] ?? "").replace(/\D/g, ""))}`
              : `${selected.length} passages`}
          </p>
          <div className="passage-bar-actions">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch swatch-${c}`}
                aria-label={`Highlight ${COLOR_NAME[c]}`}
                aria-pressed={passageMark ? passageMark.color === c : undefined}
                onClick={() => markPassages(c)}
              />
            ))}
            {selected.some((p) =>
              items.some((a) => a.scope === "passage" && a.passage === p && a.color),
            ) && (
              <button type="button" onClick={() => markPassages(null)}>
                Remove highlight
              </button>
            )}
            <button type="button" onClick={notePassages}>
              Note
            </button>
            <button type="button" aria-pressed={bookmarked} onClick={toggleBookmarks}>
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
            {(copyLayers.length ? copyLayers : (["plain", "original"] as const)).map((l) => (
              <button key={l} type="button" onClick={() => copyPassages(l)}>
                Copy {copyLayers.length > 1 || !copyLayers.length ? LAYER_NAME[l] : "with source"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const first = [...selected].sort()[0] ?? "";
                const layer = copyLayers[0] ?? "original";
                void share(withSource(passageText(first, layer), cite, layer, ""), first);
              }}
            >
              Share
            </button>
            {selected.length === 1 && (
              <>
                {/* The canonical passage URL, without ?layers= state (task 031 A7). */}
                <button
                  type="button"
                  onClick={() => void copy(url(selected[0] ?? ""), "Link to the passage copied.")}
                >
                  Copy link
                </button>
                <button type="button" onClick={() => setCompare(selected[0] ?? null)}>
                  Compare
                </button>
                {speech && (
                  <button
                    type="button"
                    onClick={() => {
                      window.dispatchEvent(
                        new CustomEvent(LISTEN_EVENT, { detail: selected[0] ?? "" }),
                      );
                      setSelected([]);
                    }}
                  >
                    Listen from here
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              className="passage-bar-close"
              aria-label="Close passage actions"
              onClick={() => {
                setSelected([]);
                opener.current?.focus();
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <dialog
        ref={noteDialog}
        className="note-dialog"
        aria-labelledby="note-title"
        onClose={() => setNoteFor(null)}
      >
        <form
          method="dialog"
          onSubmit={(e) => {
            e.preventDefault();
            saveNote(noteFor?.draft ?? "");
          }}
        >
          <h2 id="note-title">Note</h2>
          <label className="visually-hidden" htmlFor="note-text">
            Your note
          </label>
          <textarea
            id="note-text"
            rows={5}
            value={noteFor?.draft.trimStart() ?? ""}
            onChange={(e) => setNoteFor((n) => n && { ...n, draft: e.target.value })}
          />
          <p className="muted small">Saved in this browser only.</p>
          <div className="dialog-actions">
            <button type="submit">Save</button>
            <button type="button" onClick={() => saveNote(null)}>
              Delete note
            </button>
            <button type="button" onClick={() => setNoteFor(null)}>
              Cancel
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={compareDialog}
        className="compare-dialog"
        aria-labelledby="compare-title"
        onClose={() => setCompare(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setCompare(null);
        }}
      >
        {compare && <CompareSheet passage={compare} onClose={() => setCompare(null)} />}
      </dialog>
    </>
  );
}

/** One passage in every layer, labelled (task 031 C3, "compare versions"). */
function CompareSheet({ passage, onClose }: { passage: string; onClose: () => void }) {
  const row = rowOf(passage);
  const cells = (
    [
      ["Plain English", ".col-plain"],
      ["Original", ".col-original"],
      ["Context", ".col-context:not(.empty)"],
    ] as const
  ).flatMap(([label, sel]) => {
    const cell = row?.querySelector(sel);
    if (!cell) return [];
    const copy = cell.cloneNode(true) as HTMLElement;
    copy.querySelectorAll(".layer-label").forEach((n) => n.remove());
    // Read-only here: term marks become plain words.
    copy.querySelectorAll("a.term").forEach((a) => a.replaceWith(a.textContent ?? ""));
    copy.removeAttribute("id");
    return [{ label, html: copy.innerHTML, cls: sel.slice(1).split(":")[0] ?? "" }];
  });
  return (
    <div className="compare-panel">
      <div className="toc-head">
        <h2 id="compare-title">Compare passage {Number(passage.replace(/\D/g, ""))}</h2>
        <button type="button" className="toc-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      {cells.map((c) => (
        <section key={c.label} className={`compare-cell ${c.cls.replace("col-", "layer-")}`}>
          <h3 className="layer-label">{c.label}</h3>
          <div dangerouslySetInnerHTML={{ __html: c.html }} />
        </section>
      ))}
    </div>
  );
}
