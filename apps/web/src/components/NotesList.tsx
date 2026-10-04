"use client";

import { useEffect, useRef, useState } from "react";
import {
  COLORS,
  mergeAnnotations,
  migrateAnnotations,
  readAnnotations,
  saveAnnotations,
  toMarkdown,
  type Annotation,
  type Color,
} from "../lib/annotations";
import { formatRef, passageNumber } from "../lib/reference";

type Kind = "all" | "bookmark" | "highlight" | "note";
const KINDS: [Kind, string][] = [
  ["all", "All"],
  ["bookmark", "Bookmarks"],
  ["highlight", "Highlights"],
  ["note", "Notes"],
];

const matches = (a: Annotation, kind: Kind, color: Color | "all") =>
  (kind === "all" ||
    (kind === "bookmark" && a.kind === "bookmark") ||
    (kind === "highlight" && Boolean(a.color)) ||
    (kind === "note" && Boolean(a.note))) &&
  (color === "all" || a.color === color);

function download(name: string, type: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Every bookmark, highlight and note in this browser (task 031 D3), grouped by
 * work and chapter, with filters, export (Markdown and JSON) and import (JSON,
 * merged by id), so they can be backed up or moved to another browser.
 */
export function NotesList({
  initial = "all",
  refs,
}: {
  initial?: Kind;
  /** Reference prefix ("Manifesto II") by document path (task 032 A). */
  refs: Record<string, string>;
}) {
  const [items, setItems] = useState<Annotation[] | null>(null);
  const [kind, setKind] = useState<Kind>(initial);
  const [color, setColor] = useState<Color | "all">("all");
  const [status, setStatus] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const load = () => setItems(readAnnotations().items);
  useEffect(load, []);

  const remove = (id: string) => {
    saveAnnotations({ v: 1, items: readAnnotations().items.filter((a) => a.id !== id) });
    load();
  };

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const incoming = migrateAnnotations(JSON.parse(await f.text()));
      const { store, added, updated } = mergeAnnotations(readAnnotations(), incoming);
      saveAnnotations(store);
      load();
      setStatus(`Imported: ${added} new, ${updated} updated.`);
    } catch {
      setStatus("That file could not be read. Choose a JSON file exported from this page.");
    }
    if (file.current) file.current.value = "";
  };

  if (items === null) return null;
  const shown = items
    .filter((a) => matches(a, kind, color))
    .sort((a, b) => (a.path + a.passage).localeCompare(b.path + b.passage));
  const groups = new Map<string, Map<string, Annotation[]>>();
  for (const a of shown) {
    const work = groups.get(a.work || "Other texts") ?? new Map<string, Annotation[]>();
    work.set(a.title, [...(work.get(a.title) ?? []), a]);
    groups.set(a.work || "Other texts", work);
  }

  return (
    <div className="notes">
      <div className="notes-tools">
        <fieldset>
          <legend>Show</legend>
          {KINDS.map(([k, label]) => (
            <label key={k}>
              <input type="radio" name="kind" checked={kind === k} onChange={() => setKind(k)} />
              {label}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Colour</legend>
          <label>
            <input
              type="radio"
              name="color"
              checked={color === "all"}
              onChange={() => setColor("all")}
            />
            Any
          </label>
          {COLORS.map((c) => (
            <label key={c}>
              <input type="radio" name="color" checked={color === c} onChange={() => setColor(c)} />
              <span className={`swatch swatch-${c}`} aria-hidden="true" />{" "}
              {c[0]?.toUpperCase() + c.slice(1)}
            </label>
          ))}
        </fieldset>
      </div>

      {items.length === 0 ? (
        <p>
          Nothing saved yet. In the reader, tap a passage (or use its ⋯ button) to highlight it, add
          a note or bookmark it, or select words to highlight them.
        </p>
      ) : shown.length === 0 ? (
        <p>Nothing matches these filters.</p>
      ) : (
        [...groups].map(([work, chapters]) => (
          <section key={work} className="notes-work">
            <h2>{work}</h2>
            {[...chapters].map(([chapter, list]) => (
              <section key={chapter}>
                <h3>{chapter}</h3>
                <ul className="notes-items">
                  {list.map((a) => (
                    <li key={a.id} className={a.color ? `note-${a.color}` : undefined}>
                      <p className="note-meta">
                        {a.kind === "bookmark"
                          ? "Bookmark"
                          : [a.color && "Highlight", a.note && "Note"].filter(Boolean).join(" · ")}
                        {a.layer === "plain" && " · Plain English (our version)"}
                        {a.layer === "original" && " · Original"} ·{" "}
                        <a href={`${a.path}#${a.passage}`}>
                          {refs[a.path]
                            ? formatRef(refs[a.path] ?? "", a.passage)
                            : `Go to passage ${passageNumber(a.passage)}`}
                        </a>
                      </p>
                      {a.orphaned && (
                        <p className="notice" role="note">
                          Text changed — highlight could not be placed. The words you marked were:
                        </p>
                      )}
                      {(a.quote?.exact ?? a.snippet) && (
                        <blockquote>{a.quote?.exact ?? a.snippet}</blockquote>
                      )}
                      {a.note && <p className="note-text">{a.note}</p>}
                      <button type="button" className="link-button" onClick={() => remove(a.id)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </section>
        ))
      )}

      <section className="notes-backup" aria-labelledby="backup-title">
        <h2 id="backup-title">Back up or move your notes</h2>
        <p className="muted">
          Everything here lives in this browser only, and clearing site data deletes it. Export a
          copy to keep it safe or to move it to another browser.
        </p>
        <p className="notes-buttons">
          <button
            type="button"
            onClick={() =>
              download("plm-notes.md", "text/markdown", toMarkdown(items, location.origin))
            }
            disabled={items.length === 0}
          >
            Export as Markdown
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                "plm-notes.json",
                "application/json",
                JSON.stringify({ v: 1, items }, null, 2),
              )
            }
            disabled={items.length === 0}
          >
            Export as JSON
          </button>
          <label className="file-button">
            Import JSON
            <input
              ref={file}
              type="file"
              accept="application/json,.json"
              onChange={(e) => void onImport(e.target.files?.[0])}
            />
          </label>
        </p>
        <p role="status">{status}</p>
      </section>
    </div>
  );
}
