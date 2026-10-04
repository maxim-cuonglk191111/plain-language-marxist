"use client";

import { useEffect, useState } from "react";
import { readHistory } from "../lib/history";
import { BOOKMARKS_KEY, readJson, writeJson, type Bookmark } from "../lib/prefs";

/**
 * Resume link, bookmarks and passage links for one document, kept in this
 * browser (SDD §12). The saved position (written by ReadingProgress) is offered
 * as a link, never an automatic jump. Row buttons are server-rendered hidden
 * and revealed here, since they need JS.
 */
export function ReadingAids({ path, title }: { path: string; title: string }) {
  const [resume, setResume] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = readHistory().docs[path]?.passage;
    const first = document.querySelector<HTMLElement>(".rows > .row")?.id;
    if (saved && saved !== first && !location.hash && document.getElementById(saved))
      setResume(saved);
  }, [path]);

  // Bookmarks: reveal the buttons and keep their pressed state in sync.
  useEffect(() => {
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>("button.bookmark[data-passage]"),
    ];
    const sync = () => {
      const marked = new Set(
        readJson<Bookmark[]>(BOOKMARKS_KEY, [])
          .filter((b) => b.path === path)
          .map((b) => b.passage),
      );
      for (const b of buttons) {
        const on = marked.has(b.dataset["passage"] ?? "");
        b.setAttribute("aria-pressed", String(on));
        b.title = on ? "Remove bookmark" : "Bookmark this passage";
      }
    };
    const onClick = (e: Event) => {
      const button = e.currentTarget as HTMLButtonElement;
      const passage = button.dataset["passage"] ?? "";
      const all = readJson<Bookmark[]>(BOOKMARKS_KEY, []);
      const exists = all.some((b) => b.path === path && b.passage === passage);
      const row = document.getElementById(passage);
      const snippet = (
        (row?.querySelector(".layer-plain .block") ?? row?.querySelector(".layer-original .block"))
          ?.textContent ?? ""
      )
        .trim()
        .slice(0, 140);
      writeJson(
        BOOKMARKS_KEY,
        exists
          ? all.filter((b) => !(b.path === path && b.passage === passage))
          : [...all, { path, title, passage, snippet }],
      );
      sync();
    };
    for (const b of buttons) {
      b.hidden = false;
      b.addEventListener("click", onClick);
    }
    sync();
    return () => buttons.forEach((b) => b.removeEventListener("click", onClick));
  }, [path, title]);

  // Copy link to passage: the canonical URL with the passage id, no ?layers= state.
  useEffect(() => {
    const buttons = [
      ...document.querySelectorAll<HTMLButtonElement>("button.copy-link[data-passage]"),
    ];
    const onClick = async (e: Event) => {
      const passage = (e.currentTarget as HTMLButtonElement).dataset["passage"] ?? "";
      const url = `${location.origin}${path}#${passage}`;
      try {
        await navigator.clipboard.writeText(url);
        setStatus(`Link to passage ${passage} copied.`);
      } catch {
        // No clipboard (insecure context, or permission refused): put it in the address bar.
        history.replaceState(null, "", `#${passage}`);
        setStatus("Copying is not available here; the link is now in the address bar.");
      }
    };
    for (const b of buttons) {
      b.hidden = false;
      b.addEventListener("click", onClick);
    }
    return () => buttons.forEach((b) => b.removeEventListener("click", onClick));
  }, [path]);

  useEffect(() => {
    if (!status) return;
    const t = window.setTimeout(() => setStatus(""), 4000);
    return () => window.clearTimeout(t);
  }, [status]);

  return (
    <>
      <p className="toast" role="status">
        {status}
      </p>
      {resume && (
        <p className="resume" role="status">
          <a href={`#${resume}`} onClick={() => setResume(null)}>
            Continue where you left off
          </a>{" "}
          <button type="button" className="link-button" onClick={() => setResume(null)}>
            Dismiss
          </button>
        </p>
      )}
    </>
  );
}
