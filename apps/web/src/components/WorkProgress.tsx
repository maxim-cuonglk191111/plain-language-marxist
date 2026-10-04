"use client";

import { useEffect, useState } from "react";
import { readHistory, removeEntry, setFinished, type HistoryEntry } from "../lib/history";

/**
 * Local progress on the work page (task 031, Part A). Both render the
 * no-JavaScript version on the server (nothing, or a plain "Start reading"
 * link) and fill in what this browser remembers after loading.
 */

export function ChapterStatus({ path }: { path: string }) {
  const [entry, setEntry] = useState<HistoryEntry | null>(null);
  useEffect(() => setEntry(readHistory().docs[path] ?? null), [path]);

  if (!entry) return null;
  if (entry.finished)
    return (
      <span className="chapter-status">
        · <span className="read-mark">Finished</span>{" "}
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setFinished(path, null, false);
            setEntry(readHistory().docs[path] ?? null);
          }}
        >
          Mark unread
        </button>
      </span>
    );
  return <span className="chapter-status">· {entry.percent}% read</span>;
}

export function ContinueReading({
  workPath,
  firstChapter,
}: {
  workPath: string;
  firstChapter: string;
}) {
  const [resume, setResume] = useState<{ href: string; title: string } | null>(null);
  useEffect(() => {
    const latest = Object.entries(readHistory().docs)
      .filter(([p, e]) => p.startsWith(workPath) && e.passage && !e.finished)
      .sort((a, b) => b[1].updated - a[1].updated)[0];
    if (latest) setResume({ href: `${latest[0]}#${latest[1].passage}`, title: latest[1].title });
  }, [workPath]);

  return (
    <p className="work-actions">
      {resume ? (
        <>
          <a className="start-reading" href={resume.href}>
            Continue reading
          </a>{" "}
          <span className="muted">{resume.title}</span>
        </>
      ) : (
        <a className="start-reading" href={firstChapter}>
          Start reading
        </a>
      )}
    </p>
  );
}

/** Home page: the chapters this browser has started, most recent first. */
export function ContinueShelf() {
  const [items, setItems] = useState<[string, HistoryEntry][]>([]);
  const load = () =>
    setItems(Object.entries(readHistory().docs).sort((a, b) => b[1].updated - a[1].updated));
  useEffect(load, []);

  if (items.length === 0) return null;
  return (
    <section className="shelf" aria-labelledby="shelf-title">
      <h2 id="shelf-title">Continue reading</h2>
      <ul>
        {items.map(([path, e]) => (
          <li key={path}>
            <a href={e.passage ? `${path}#${e.passage}` : path}>{e.title}</a>
            {e.work && <span className="muted"> · {e.work}</span>}
            <span className="shelf-progress">
              {e.finished ? (
                <span className="read-mark">Finished</span>
              ) : (
                <>
                  <span className="progress-track" aria-hidden="true">
                    <span className="progress-fill" style={{ width: `${e.percent}%` }} />
                  </span>
                  {e.percent}% read
                </>
              )}
            </span>
            <button
              type="button"
              className="link-button"
              aria-label={`Remove ${e.title} from this list`}
              onClick={() => {
                removeEntry(path);
                load();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
