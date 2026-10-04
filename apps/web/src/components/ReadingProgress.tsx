"use client";

import { useEffect, useState } from "react";
import { recordPosition, setFinished, type ChapterMeta } from "../lib/history";
import { currentLayers } from "../lib/layers";
import { readerRows, rowAtLine } from "../lib/position";
import { PREFS_EVENT, readPrefs } from "../lib/prefs";
import { estimate, timeLeft, type RowCount } from "../lib/progress";

type State = { percent: number; left: string; passage: number };

/**
 * Progress through the chapter (task 031, Part A): a thin bar under the reader
 * bar and "Ch. II · 42% · about 9 min left · Passage 17 of 65". Time left counts
 * the words of the layers shown (data-words on each row, from the build). Also
 * remembers the position, and marks the chapter finished when its end card
 * comes into view. Needs JavaScript; without it nothing is shown.
 */
export function ReadingProgress({
  path,
  meta,
  short,
  numeral,
  passages,
}: {
  path: string;
  meta: ChapterMeta;
  short: string;
  /** The chapter number in references ("II"), for "II.17 of 76" (task 032). */
  numeral: string;
  passages: number;
}) {
  const [state, setState] = useState<State | null>(null);

  useEffect(() => {
    const rows = readerRows();
    const counts: RowCount[] = rows.map((r) => {
      const [p = 0, o = 0, c = 0] = (r.dataset["words"] ?? "").split(" ").map(Number);
      return { words: [p, o, c], untranslated: r.classList.contains("untranslated") };
    });
    let wpm = readPrefs().wpm;
    let frame = 0;
    let saveTimer: number | undefined;

    const update = () => {
      frame = 0;
      if (rows.length === 0) return;
      const { index, fraction } = rowAtLine(rows);
      const atBottom =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      const est = atBottom
        ? { percent: 100, wordsLeft: 0 }
        : estimate(counts, currentLayers(), index, fraction);
      const row = rows[index];
      if (!row) return;
      setState({
        percent: est.percent,
        left: timeLeft(est.wordsLeft, wpm),
        passage: Number(row.dataset["n"]) || index + 1,
      });
      window.clearTimeout(saveTimer);
      // Only remember a position once the reader has moved into the text.
      if (window.scrollY > 0 || location.hash)
        saveTimer = window.setTimeout(() => recordPosition(path, meta, row.id, est.percent), 400);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    // Reading speed changed in Settings.
    const onPrefs = () => {
      wpm = readPrefs().wpm;
      schedule();
    };
    window.addEventListener(PREFS_EVENT, onPrefs);
    // Layer toggles change which words count.
    const layers = new MutationObserver(schedule);
    layers.observe(document.documentElement, { attributeFilter: ["data-layers"] });

    // The end-of-chapter card in view: the chapter is finished.
    const end = document.querySelector(".end-card");
    const finished = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setFinished(path, meta, true);
        finished.disconnect();
      }
    });
    if (end) finished.observe(end);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(saveTimer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener(PREFS_EVENT, onPrefs);
      layers.disconnect();
      finished.disconnect();
    };
    // meta is a fresh object each render but describes the same chapter as path.
  }, [path]);

  // Tell the CSS how tall the sticky bar is, so passages jumped to are never under it.
  useEffect(() => {
    const bar = document.querySelector<HTMLElement>(".reader-bar");
    if (!bar) return;
    const html = document.documentElement;
    const set = () => html.style.setProperty("--bar-h", `${Math.ceil(bar.offsetHeight)}px`);
    set();
    const observer = new ResizeObserver(set);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      html.style.removeProperty("--bar-h");
    };
  }, []);

  if (!state) return null;
  return (
    <div className="reader-progress">
      <div className="progress-track" aria-hidden="true">
        <div className="progress-fill" style={{ width: `${state.percent}%` }} />
      </div>
      <p className="progress-label">
        <span>
          {short} · {state.percent}% · {state.left}
        </span>
        <span className="progress-passage">
          {numeral}.{state.passage} of {passages}
        </span>
      </p>
    </div>
  );
}
