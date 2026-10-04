"use client";

import { useEffect, useRef, useState } from "react";
import { readerRows, rowAtLine, readingLine } from "../lib/position";
import { PREFS_EVENT, readPrefs, savePrefs, type ReaderPrefs } from "../lib/prefs";
import { onShortcut } from "./Shortcuts";

const setPref = <K extends keyof ReaderPrefs>(key: K, value: ReaderPrefs[K]) =>
  savePrefs({ ...readPrefs(), [key]: value });

/** Follows a preference as it changes (from Settings or another control). */
function usePref<K extends keyof ReaderPrefs>(key: K): ReaderPrefs[K] | null {
  const [value, setValue] = useState<ReaderPrefs[K] | null>(null);
  useEffect(() => {
    const sync = () => setValue(readPrefs()[key]);
    sync();
    window.addEventListener(PREFS_EVENT, sync);
    return () => window.removeEventListener(PREFS_EVENT, sync);
  }, [key]);
  return value;
}

/**
 * Focus mode (task 031 C1): hides the site header, the chapter header and the
 * footer. The reader bar stays, with this button to leave focus mode, so the
 * layer switch is always at hand. Remembered, and applied before first paint.
 */
export function FocusToggle() {
  const focus = usePref("focus");
  useEffect(
    () => onShortcut("focus", () => setPref("focus", readPrefs().focus === "on" ? "off" : "on")),
    [],
  );
  if (focus === null) return null;
  const on = focus === "on";
  return (
    <button
      type="button"
      className="toc-button focus-button"
      aria-pressed={on}
      title="Focus mode (f)"
      onClick={() => setPref("focus", on ? "off" : "on")}
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
        {on ? (
          <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
        ) : (
          <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
        )}
      </svg>
      <span className="bar-text">{on ? "Exit focus mode" : "Focus mode"}</span>
    </button>
  );
}

/**
 * Reading aids (C4) and keep-screen-on (C5), both off by default.
 * Paragraph focus marks the passage at the reading line (CSS dims the rest);
 * the ruler is a band that follows the mouse, or the passage stepped to with
 * j/k. The screen wake lock is taken while the page is visible and released
 * when it is hidden or the setting is turned off.
 */
export function ReaderExtras() {
  const aid = usePref("aid");
  const screen = usePref("screen");
  const ruler = useRef<HTMLDivElement>(null);

  // Paragraph focus: keep data-current on the passage at the reading line.
  useEffect(() => {
    if (aid !== "paragraph") return;
    const rows = readerRows();
    let frame = 0;
    let current: HTMLElement | undefined;
    const update = () => {
      frame = 0;
      const row = rows[rowAtLine(rows).index];
      if (row === current) return;
      if (current) delete current.dataset["current"];
      current = row;
      if (row) row.dataset["current"] = "1";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      if (current) delete current.dataset["current"];
    };
  }, [aid]);

  // Reading ruler: at the reading line, then wherever the mouse is.
  useEffect(() => {
    if (aid !== "ruler") return;
    const band = ruler.current;
    if (!band) return;
    const place = (y: number) => {
      band.style.transform = `translateY(${Math.round(y - band.offsetHeight / 2)}px)`;
    };
    place(readingLine());
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "mouse") place(e.clientY);
    };
    // After j/k the passage sits just under the reader bar: put the band on its first line.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "j" && e.key !== "k") return;
      window.setTimeout(() => {
        const bar = document.querySelector(".reader-bar")?.getBoundingClientRect().bottom ?? 0;
        place(bar + band.offsetHeight / 2 + 12);
      }, 350);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("keydown", onKey);
    };
  }, [aid]);

  // Keep the screen on.
  useEffect(() => {
    type Sentinel = { release: () => Promise<void> };
    const lock = (
      navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } }
    ).wakeLock;
    if (screen !== "on" || !lock) return;
    let sentinel: Sentinel | null = null;
    let stopped = false;
    const take = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const s = await lock.request("screen");
        if (stopped) void s.release();
        else sentinel = s;
      } catch {
        // Refused (battery saver, permissions): the screen behaves as usual.
      }
    };
    // The browser drops the lock when the page is hidden; take it again on return.
    const onVisible = () => void take();
    void take();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, [screen]);

  return aid === "ruler" ? <div ref={ruler} className="reading-ruler" aria-hidden="true" /> : null;
}
