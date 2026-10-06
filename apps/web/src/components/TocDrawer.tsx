"use client";

import { useEffect, useRef, useState } from "react";
import { readHistory } from "../lib/history";
import { readingLine } from "../lib/position";
import { chapterNumber, parseRef, type RefWork } from "../lib/reference";
import { onShortcut } from "./Shortcuts";

export type TocChapter = {
  path: string;
  name: string;
  part?: string | undefined;
  sections: { id: string; title: string; level: number }[];
};

/**
 * The table of contents drawer (task 031, Part A): every chapter of the work,
 * the current one opened to its sections, the current place marked. Opens from
 * the reader bar or with "t". A modal <dialog>, so focus stays inside while it
 * is open and Escape closes it. Without JavaScript the reader header has the
 * same contents as a <details> list instead.
 */
export function TocDrawer({
  current,
  chapters,
  workPath,
  workTitle,
  refs,
}: {
  current: string;
  chapters: TocChapter[];
  workPath: string;
  workTitle: string;
  /** For "Go to a passage" (task 032 A). */
  refs: RefWork;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const [here, setHere] = useState<string | null>(null);
  const [finished, setFinishedPaths] = useState<Set<string>>(new Set());
  const sections = chapters.find((c) => c.path === current)?.sections ?? [];

  const open = () => {
    const d = dialog.current;
    if (!d || d.open) return;
    // The section the reading line is in: the last heading above it.
    const line = readingLine();
    let at: string | null = null;
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el && el.getBoundingClientRect().top <= line) at = s.id;
    }
    setHere(at);
    setFinishedPaths(
      new Set(
        Object.entries(readHistory().docs)
          .filter(([, e]) => e.finished)
          .map(([p]) => p),
      ),
    );
    d.showModal();
  };
  const close = () => dialog.current?.close();
  const [goError, setGoError] = useState("");

  /** "II.17", "ch2 17", "chapter 3": jump there, or say plainly why not. */
  const goTo = (value: string) => {
    const r = parseRef(value, [refs], refs);
    if (!r) return setGoError("Type a passage reference, such as II.17 or chapter 3.");
    if (!r.ok) return setGoError(r.message);
    setGoError("");
    const hash = r.passage ? `#${r.passage}` : "";
    if (r.path === current) {
      close();
      if (hash) location.hash = hash;
      else window.scrollTo({ top: 0 });
    } else location.href = r.path + hash;
  };

  // "t" (the shortcuts component decides when keys apply).
  useEffect(() => onShortcut("toc", open));

  return (
    <>
      <button
        ref={button}
        type="button"
        className="toc-button"
        aria-haspopup="dialog"
        onClick={open}
        title="Contents (t)"
      >
        <svg
          className="bar-icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        <span className="bar-text">Contents</span>
      </button>
      <dialog
        ref={dialog}
        className="toc-drawer"
        aria-labelledby="toc-title"
        onClose={() => button.current?.focus()}
        // A click on the backdrop (the dialog element itself, outside its panel) closes it.
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="toc-panel">
          <div className="toc-head">
            <h2 id="toc-title">Contents</h2>
            <button type="button" className="toc-close" onClick={close} aria-label="Close contents">
              ×
            </button>
          </div>
          <form
            className="toc-goto"
            onSubmit={(e) => {
              e.preventDefault();
              goTo(new FormData(e.currentTarget).get("ref")?.toString() ?? "");
            }}
          >
            <label htmlFor="toc-goto-input">Go to a passage</label>
            <span className="toc-goto-row">
              <input
                id="toc-goto-input"
                name="ref"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={`e.g. ${(refs.chapters.find((c) => !Number.isNaN(chapterNumber(c.numeral))) ?? refs.chapters[0])?.numeral ?? "I"}.17`}
                aria-describedby="toc-goto-message"
                aria-invalid={goError ? true : undefined}
                onInput={() => setGoError("")}
              />
              <button type="submit">Go</button>
            </span>
            <p id="toc-goto-message" className="toc-goto-message" role="status">
              {goError}
            </p>
          </form>
          <p className="toc-work">
            <a href={workPath}>{workTitle}</a>
          </p>
          <ol className="toc-chapters">
            {chapters.flatMap((c, idx) => {
              const isCurrent = c.path === current;
              const prevChapter = chapters[idx - 1];
              const showPartHeader = Boolean(c.part && c.part !== prevChapter?.part);
              const items: React.ReactNode[] = [];
              if (showPartHeader) {
                items.push(
                  <li key={`part-${c.part}`} className="toc-part-header">
                    {c.part}
                  </li>,
                );
              }
              items.push(
                <li key={c.path} className={isCurrent ? "current" : undefined}>
                  <a href={c.path} aria-current={isCurrent ? "page" : undefined}>
                    {c.name}
                  </a>
                  {finished.has(c.path) && <span className="read-mark"> · Finished</span>}
                  {isCurrent && c.sections.length > 0 && (
                    <ol className="toc-sections">
                      {c.sections.map((s) => (
                        <li key={s.id} className={`level-${Math.min(s.level, 6)}`}>
                          <a
                            href={`#${s.id}`}
                            aria-current={here === s.id ? "location" : undefined}
                            onClick={close}
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ol>
                  )}
                </li>,
              );
              return items;
            })}
          </ol>
        </div>
      </dialog>
    </>
  );
}
