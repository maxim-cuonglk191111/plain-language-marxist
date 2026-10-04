"use client";

import { useEffect, useRef } from "react";
import { isTyping, readerRows, rowAtLine } from "../lib/position";
import { readPrefs } from "../lib/prefs";

/** What a key asks for. Components that own the feature listen for SHORTCUT_EVENT. */
export type ShortcutAction = "toc" | "settings" | "focus" | "bookmark" | "highlight";
export const SHORTCUT_EVENT = "plm:shortcut";
export const onShortcut = (action: ShortcutAction, run: () => void) => {
  const listener = (e: Event) => {
    if ((e as CustomEvent).detail === action) run();
  };
  window.addEventListener(SHORTCUT_EVENT, listener);
  return () => window.removeEventListener(SHORTCUT_EVENT, listener);
};

const KEYS: [string, string][] = [
  ["j / k", "Next / previous passage"],
  ["[ / ]", "Previous / next chapter"],
  ["t", "Contents"],
  ["s", "Settings"],
  ["f", "Focus mode"],
  ["b", "Bookmark the current passage"],
  ["h", "Highlight the selected words"],
  ["/", "Search"],
  ["?", "This list"],
];

/** Moves to the passage after (or before) the one at the reading line. */
function stepPassage(by: number) {
  const rows = readerRows();
  if (!rows.length) return;
  const { index } = rowAtLine(rows);
  const to = rows[Math.min(Math.max(index + by, 0), rows.length - 1)];
  to?.scrollIntoView({
    block: "start",
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

/**
 * Single-key shortcuts (task 031 C6), with a "?" list. They never fire while
 * typing, with a modifier key, or with a dialog open, and Settings can switch
 * them all off (WCAG 2.2 SC 2.1.4).
 */
export function Shortcuts() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.defaultPrevented) return;
      if (document.querySelector("dialog[open], .term-card")) return;
      if (readPrefs().shortcuts === "off") return;
      const send = (action: ShortcutAction) =>
        window.dispatchEvent(new CustomEvent(SHORTCUT_EVENT, { detail: action }));
      const link = (rel: string) =>
        document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.href;
      let handled = true;
      switch (e.key) {
        case "j":
          stepPassage(1);
          break;
        case "k":
          stepPassage(-1);
          break;
        case "[":
        case "]": {
          const href = link(e.key === "[" ? "prev" : "next");
          if (href) location.href = href;
          else handled = false;
          break;
        }
        case "t":
          send("toc");
          break;
        case "s":
          send("settings");
          break;
        case "f":
          send("focus");
          break;
        case "b":
          send("bookmark");
          break;
        case "h":
          send("highlight");
          break;
        case "/":
          if (location.pathname.startsWith("/search")) document.querySelector("input")?.focus();
          else location.href = "/search/";
          break;
        case "?":
          dialog.current?.showModal();
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <dialog
      ref={dialog}
      className="note-dialog shortcuts-dialog"
      aria-labelledby="shortcuts-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      <h2 id="shortcuts-title">Keyboard shortcuts</h2>
      <table className="shortcuts">
        <tbody>
          {KEYS.map(([key, what]) => (
            <tr key={key}>
              <th scope="row">
                {key.split(" / ").map((k, i) => (
                  <span key={k}>
                    {i > 0 && " / "}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </th>
              <td>{what}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        They do nothing while you type. You can switch them off in Settings (“Keyboard shortcuts”).
      </p>
      <div className="dialog-actions">
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
    </dialog>
  );
}
