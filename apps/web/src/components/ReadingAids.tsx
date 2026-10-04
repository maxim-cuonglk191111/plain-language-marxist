"use client";

import { useEffect, useState } from "react";
import { readHistory } from "../lib/history";
import { TOAST_EVENT } from "./Annotations";

/**
 * The resume link and short confirmations for one document, kept in this
 * browser (SDD §12). The saved position (written by ReadingProgress) is offered
 * as a link, never an automatic jump. Bookmarks, highlights and notes are in
 * Annotations (task 031 D), which reports through the toast here.
 */
export function ReadingAids({ path }: { path: string }) {
  const [resume, setResume] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = readHistory().docs[path]?.passage;
    const first = document.querySelector<HTMLElement>(".rows > .row")?.id;
    if (saved && saved !== first && !location.hash && document.getElementById(saved))
      setResume(saved);
  }, [path]);

  useEffect(() => {
    const onToast = (e: Event) => setStatus(String((e as CustomEvent).detail ?? ""));
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

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
