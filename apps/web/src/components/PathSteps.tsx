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

import type { PathStage } from "../lib/paths";

type Local = { ticks: PathTicks; history: History };

/**
 * A reading path's steps (task 032 C). The server renders a plain list of
 * links and a "Start this path" link; with JavaScript, each chapter gets a
 * "Read" tick (from the reading history, or set by hand) and the link becomes
 * "Continue this path", to the first chapter not yet read.
 */
export function PathSteps({
  id,
  steps,
  stages,
}: {
  id: string;
  steps: PathStep[];
  stages?: PathStage[] | null | undefined;
}) {
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

  const renderStep = (s: PathStep, i: number) => (
    <li key={`${i}-${s.href}`} className={s.kind === "work" ? "path-step-work" : undefined}>
      {s.kind === "chapter" ? (
        <div className="path-row">
          <div className="path-step-body">
            <a className="path-step-title" href={s.href}>
              {s.title}
            </a>
            <div className="path-step-meta muted">
              {s.title !== s.work && <span className="path-step-work-name">{s.work}</span>}
              {s.title !== s.work && <span aria-hidden="true">·</span>}
              <span className="path-step-time">about {s.chapters[0]?.minutes ?? 1} min</span>
            </div>
          </div>
          {s.chapters[0] && tick(s.chapters[0])}
        </div>
      ) : (
        <>
          <div className="path-row">
            <div className="path-step-body">
              <a className="path-step-title" href={s.href}>
                {s.title}
              </a>
              <div className="path-step-meta muted">
                <span>the whole work, {s.chapters.length} chapters</span>
                <span aria-hidden="true">·</span>
                <span className="path-step-time">
                  about {s.chapters.reduce((n, c) => n + c.minutes, 0)} min
                </span>
              </div>
            </div>
          </div>
          <ol className="path-chapters">
            {s.chapters.map((c) => (
              <li key={c.path} className="path-row">
                <div className="path-step-body">
                  <a className="path-step-title" href={c.path}>
                    {c.title}
                  </a>
                  <div className="path-step-meta muted">
                    <span className="path-step-time">about {c.minutes} min</span>
                  </div>
                </div>
                {tick(c)}
              </li>
            ))}
          </ol>
        </>
      )}
    </li>
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
      {stages && stages.length > 0 ? (
        <div className="path-stages">
          {stages.map((st, sIdx) => {
            let offset = 0;
            for (let j = 0; j < sIdx; j++) {
              offset += stages[j]?.steps.length ?? 0;
            }
            return (
              <section
                key={`${sIdx}-${st.title}`}
                className="path-stage"
                aria-labelledby={`stage-heading-${sIdx}`}
              >
                <header className="path-stage-header">
                  <h3 id={`stage-heading-${sIdx}`} className="path-stage-title">
                    {st.title}
                  </h3>
                  {st.description && <p className="path-stage-desc muted">{st.description}</p>}
                </header>
                <ol className="path-steps" start={offset + 1}>
                  {st.steps.map((s, i) => renderStep(s, offset + i))}
                </ol>
              </section>
            );
          })}
        </div>
      ) : (
        <ol className="path-steps">{steps.map((s, i) => renderStep(s, i))}</ol>
      )}
    </>
  );
}
