"use client";

import { useEffect, useRef, useState } from "react";
import { readHistory } from "../lib/history";
import { isTyping, readingLine } from "../lib/position";

export type TocChapter = {
  path: string;
  name: string;
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
}: {
  current: string;
  chapters: TocChapter[];
  workPath: string;
  workTitle: string;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "t" || isTyping(e) || dialog.current?.open) return;
      if (document.querySelector(".term-card, dialog[open]")) return;
      e.preventDefault();
      open();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

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
          <p className="toc-work">
            <a href={workPath}>{workTitle}</a>
          </p>
          <ol className="toc-chapters">
            {chapters.map((c) => {
              const isCurrent = c.path === current;
              return (
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
                </li>
              );
            })}
          </ol>
        </div>
      </dialog>
    </>
  );
}
