"use client";

import type { DataTerm } from "@plm/schema";
import { formFor, resolveChoice, type ResolveContext, type TermChoice } from "@plm/terms";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTermFile } from "../lib/terms";
import { TermDetails } from "./TermDetails";

const STORAGE_KEY = "plm:terms";
type Preferences = { all?: "original"; perTerm: Record<string, TermChoice> };

function loadPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Preferences) : null;
    if (!parsed || typeof parsed !== "object") return { perTerm: {} };
    return { ...parsed, perTerm: parsed.perTerm ?? {} };
  } catch {
    return { perTerm: {} };
  }
}

function savePreferences(p: Preferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage unavailable (private mode): the choice still applies to this page.
  }
}

const capitalizeFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Open = { term: DataTerm; button: HTMLElement; inPlain: boolean };

/**
 * Term cards and terminology preference (SDD §6.3, §12). Server-rendered term
 * buttons show the project default; this component re-resolves the Plain
 * English ones from the reader's local preference and opens a card on click.
 * The Original is never changed.
 */
export function TermCards({
  terms,
  context,
}: {
  terms: DataTerm[];
  context: { workId: string; authors: string[] };
}) {
  const byTerm = useMemo(() => new Map(terms.map((t) => [t.term, t])), [terms]);
  const files = useMemo(() => new Map(terms.map((t) => [t.term, toTermFile(t)])), [terms]);
  const [prefs, setPrefs] = useState<Preferences>({ perTerm: {} });
  const [open, setOpen] = useState<Open | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const resolveContext = useCallback(
    (p: Preferences): ResolveContext => ({
      workId: context.workId,
      authors: context.authors,
      preferences: p.perTerm,
      ...(p.all ? { preferAll: p.all } : {}),
    }),
    [context],
  );

  // Re-resolve every Plain English term button from the preferences.
  const apply = useCallback(
    (p: Preferences) => {
      // Kept terms (data-kept) are ordinary words with no choice of wording: leave them as written.
      const buttons = ".layer-plain .term[data-term]:not([data-kept])";
      document.querySelectorAll<HTMLElement>(buttons).forEach((el) => {
        const file = files.get(el.dataset["term"] ?? "");
        if (!file) return;
        const word = formFor(
          file,
          resolveChoice(file, resolveContext(p), el.dataset["pin"]),
          el.dataset["form"] ?? "sg",
        );
        if (word !== undefined) el.textContent = el.dataset["cap"] ? capitalizeFirst(word) : word;
      });
    },
    [files, resolveContext],
  );

  useEffect(() => {
    const p = loadPreferences();
    setPrefs(p);
    apply(p);
  }, [apply]);

  const update = (p: Preferences) => {
    setPrefs(p);
    savePreferences(p);
    apply(p);
  };

  // One delegated listener for every term button on the page.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const button = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "button.term[data-term]",
      );
      if (!button) return;
      const term = byTerm.get(button.dataset["term"] ?? "");
      if (!term) return;
      setOpen({ term, button, inPlain: Boolean(button.closest(".layer-plain")) });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [byTerm]);

  // Focus the card when it opens; Escape or a click outside closes it and returns focus.
  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    const close = () => {
      setOpen(null);
      open.button.focus();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!cardRef.current?.contains(target) && !open.button.contains(target)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Position next to the button on wide screens; CSS turns it into a bottom sheet on narrow ones.
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const r = open.button.getBoundingClientRect();
    const width = 352;
    setPosition({
      top: r.bottom + window.scrollY + 8,
      left: Math.max(
        8,
        Math.min(
          r.left + window.scrollX,
          window.scrollX + document.documentElement.clientWidth - width - 8,
        ),
      ),
    });
  }, [open]);

  const choiceFor = (t: DataTerm): TermChoice => {
    const file = files.get(t.term);
    return file ? resolveChoice(file, resolveContext(prefs)) : t.default;
  };

  return (
    <>
      <div className="term-pref" role="group" aria-label="Terminology in Plain English">
        <span>Terms:</span>
        <button
          type="button"
          aria-pressed={!prefs.all}
          onClick={() => update({ perTerm: prefs.perTerm })}
        >
          Project wording
        </button>
        <button
          type="button"
          aria-pressed={prefs.all === "original"}
          onClick={() => update({ ...prefs, all: "original" })}
        >
          Original terms
        </button>
      </div>

      {open && (
        <div
          ref={cardRef}
          className="term-card"
          role="dialog"
          aria-label={`Term: ${open.term.original["sg"] ?? open.term.term}`}
          tabIndex={-1}
          style={position ? { top: position.top, left: position.left } : undefined}
        >
          <TermCardBody
            term={open.term}
            choice={choiceFor(open.term)}
            inPlain={open.inPlain}
            onChoose={(choice) =>
              update({ ...prefs, perTerm: { ...prefs.perTerm, [open.term.term]: choice } })
            }
          />
          <button
            type="button"
            className="term-card-close"
            onClick={() => setOpen(null)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

function TermCardBody({
  term,
  choice,
  inPlain,
  onChoose,
}: {
  term: DataTerm;
  choice: TermChoice;
  inPlain: boolean;
  onChoose: (choice: TermChoice) => void;
}) {
  const shown = term.renderings.find((r) => r.key === choice);
  const original = term.original["sg"] ?? term.term;
  const choosable = term.renderings.length > 1;
  return (
    <>
      <p className="term-card-name">{original}</p>
      {inPlain && choosable && (
        <p className="term-card-shown">
          Shown here as{" "}
          <strong>{choice === "original" ? original : (shown?.forms["sg"] ?? choice)}</strong>
        </p>
      )}
      <p>{term.definition.short}</p>
      <TermDetails term={term} />
      {inPlain && shown && choosable && (
        <div className="term-card-why">
          <p className="term-card-label">Why this wording?</p>
          <p>{shown.reason}</p>
          {shown.limitation && <p className="muted">Limitation: {shown.limitation}</p>}
        </div>
      )}
      {choosable && (
        <fieldset className="term-card-choices">
          <legend className="term-card-label">Alternatives (community usage)</legend>
          {term.renderings.map((r) => (
            <label key={r.key}>
              <input
                type="radio"
                name={`term-${term.term}`}
                checked={choice === r.key}
                onChange={() => onChoose(r.key)}
              />
              {r.forms["sg"] ?? r.key}
              {r.key === term.default ? " (project default)" : ""}
              <span className="muted">
                {" "}
                · {r.usage} {r.usage === 1 ? "use" : "uses"}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <a href={`/vocabulary/${term.term}/`}>More about this term</a>
    </>
  );
}
