"use client";

import { useEffect, useState } from "react";
import { readHistory, type History } from "../lib/history";
import {
  isDone,
  nextChapter,
  pathCounts,
  readPathTicks,
  savePathTicks,
  setTick,
  type PathChapter,
  type PathStep,
  type PathTicks,
} from "../lib/pathprogress";

type Local = { ticks: PathTicks; history: History };

/**
 * A reading path's steps (task 032 C). The server renders a plain list of
 * links and a "Start this path" link; with JavaScript, each chapter gets a
 * "Read" tick (from the reading history, or set by hand) and the link becomes
 * "Continue this path", to the first chapter not yet read.
 */
export function PathSteps({ id, steps }: { id: string; steps: PathStep[] }) {
  const [local, setLocal] = useState<Local | null>(null);

  useEffect(() => {
    const load = () => setLocal({ ticks: readPathTicks(), history: readHistory() });
    load();
    // Coming back from a chapter (back button, another tab): show what changed.
    window.addEventListener("pageshow", load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener("pageshow", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const done = (chapter: string) =>
    local ? isDone(local.ticks, local.history, id, chapter) : false;
  const toggle = (chapter: string, value: boolean) => {
    const ticks = readPathTicks();
    const history = readHistory();
    const next = setTick(ticks, history, id, chapter, value);
    savePathTicks(next);
    setLocal({ ticks: next, history });
  };

  const first = steps[0]?.chapters[0];
  const counts = pathCounts(steps, done);
  const next = nextChapter(steps, done);
  const entry = next && local?.history.docs[next.path];
  const resume = entry && !entry.finished && entry.passage ? `#${entry.passage}` : "";

  const tick = (c: PathChapter) =>
    local && (
      <label className="path-tick">
        <input
          type="checkbox"
          // Starts with the visible word, so speech users can say it (SC 2.5.3).
          aria-label={`Read: ${c.title}`}
          checked={done(c.path)}
          onChange={(e) => toggle(c.path, e.currentTarget.checked)}
        />{" "}
        Read
      </label>
    );

  return (
    <>
      <div className="work-actions path-actions">
        {!local || counts.done === 0 ? (
          first && (
            <a className="start-reading" href={first.path}>
              Start this path
            </a>
          )
        ) : next ? (
          <>
            <a className="start-reading" href={next.path + resume}>
              Continue this path
            </a>{" "}
            <span className="muted">{next.title}</span>
          </>
        ) : (
          <p className="read-mark">You have read every step of this path.</p>
        )}
        {local && (
          <p className="muted small path-count" aria-live="polite">
            {counts.done} of {counts.total} chapters read
          </p>
        )}
      </div>
      <ol className="path-steps">
        {steps.map((s, i) => (
          <li key={`${i}-${s.href}`} className={s.kind === "work" ? "path-step-work" : undefined}>
            {s.kind === "chapter" ? (
              <div className="path-row">
                <span>
                  <a href={s.href}>{s.title}</a>{" "}
                  <span className="muted">
                    · {s.work} · about {s.chapters[0]?.minutes ?? 1} min
                  </span>
                </span>
                {s.chapters[0] && tick(s.chapters[0])}
              </div>
            ) : (
              <>
                <div className="path-row">
                  <span>
                    <a href={s.href}>{s.title}</a>{" "}
                    <span className="muted">
                      · the whole work, {s.chapters.length} chapters, about{" "}
                      {s.chapters.reduce((n, c) => n + c.minutes, 0)} min
                    </span>
                  </span>
                </div>
                <ol className="path-chapters">
                  {s.chapters.map((c) => (
                    <li key={c.path} className="path-row">
                      <span>
                        <a href={c.path}>{c.title}</a>{" "}
                        <span className="muted">· about {c.minutes} min</span>
                      </span>
                      {tick(c)}
                    </li>
                  ))}
                </ol>
              </>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
