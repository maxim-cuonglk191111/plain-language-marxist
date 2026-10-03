"use client";

import { useEffect, useState } from "react";
import { BOOKMARKS_KEY, progressKey, readJson, writeJson, type Bookmark } from "../lib/prefs";

/**
 * Reading progress and bookmarks for one document, both kept in this browser
 * (SDD §12). Progress is offered as a link, never an automatic jump. Bookmark
 * buttons are server-rendered hidden and revealed here, since they need JS.
 */
export function ReadingAids({ path, title }: { path: string; title: string }) {
  const [resume, setResume] = useState<string | null>(null);

  // Remember the topmost row on screen.
  useEffect(() => {
    const saved = readJson<string | null>(progressKey(path), null);
    const first = document.querySelector<HTMLElement>(".rows > .row")?.id;
    if (saved && saved !== first && !location.hash && document.getElementById(saved))
      setResume(saved);

    let timer: number | undefined;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = (e.target as HTMLElement).id;
          if (e.isIntersecting) visible.set(id, e.boundingClientRect.top);
          else visible.delete(id);
        }
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          const top = [...visible].sort((a, b) => a[1] - b[1])[0]?.[0];
          if (top) writeJson(progressKey(path), top);
        }, 400);
      },
      { rootMargin: "0px 0px -60% 0px" },
    );
    document.querySelectorAll(".rows > .row").forEach((row) => observer.observe(row));
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
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

  if (!resume) return null;
  return (
    <p className="resume" role="status">
      <a href={`#${resume}`} onClick={() => setResume(null)}>
        Continue where you left off
      </a>{" "}
      <button type="button" className="link-button" onClick={() => setResume(null)}>
        Dismiss
      </button>
    </p>
  );
}
