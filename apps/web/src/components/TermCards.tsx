"use client";

import type { DataTerm } from "@plm/schema";
import { formFor, resolveChoice, type ResolveContext, type TermChoice } from "@plm/terms";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toTermFile } from "../lib/terms";
import { TermDetails, TermShort } from "./TermDetails";

const STORAGE_KEY = "plm:terms";
type Preferences = { all?: "original"; perTerm: Record<string, TermChoice> };

/** Cards can nest this deep (task 024); terms in the last card are not clickable. */
export const MAX_CARDS = 5;

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
const nameOf = (t: DataTerm) => t.original["sg"] ?? t.term;

/** One open card: its term, the element that opened it (focus returns there), and where it sits. */
type Card = {
  term: DataTerm;
  opener: HTMLElement;
  inPlain: boolean;
  position: { top: number; left: number };
};

const CARD_WIDTH = 352;
const NEST_OFFSET = 24;

/** Next to the opener on wide screens; CSS turns cards into stacked bottom sheets on phones. */
function positionFor(opener: HTMLElement, below?: Card): Card["position"] {
  const maxLeft = window.scrollX + document.documentElement.clientWidth - CARD_WIDTH - 8;
  if (below) {
    return {
      top: below.position.top + NEST_OFFSET,
      left: Math.max(8, Math.min(below.position.left + NEST_OFFSET, maxLeft)),
    };
  }
  const r = opener.getBoundingClientRect();
  return {
    top: r.bottom + window.scrollY + 8,
    left: Math.max(8, Math.min(r.left + window.scrollX, maxLeft)),
  };
}

/**
 * Term cards and terminology preference (SDD §6.3, §12). Server-rendered term
 * buttons show the project default; this component re-resolves the Plain
 * English ones from the reader's local preference and opens a card on click.
 * The Original is never changed.
 *
 * Terms inside a card open a nested card on top (task 024), up to MAX_CARDS.
 * A click outside the top card, or Escape, closes one card at a time.
 */
export function TermCards({
  terms,
  context,
  counts = {},
}: {
  terms: DataTerm[];
  context: { workId: string; authors: string[] };
  /** How often each term is marked in the texts (task 032 B concordance). */
  counts?: Readonly<Record<string, number>>;
}) {
  const [loaded, setLoaded] = useState<ReadonlyMap<string, DataTerm>>(
    () => new Map(terms.map((t) => [t.term, t])),
  );
  const files = useMemo(
    () => new Map([...loaded.values()].map((t) => [t.term, toTermFile(t)])),
    [loaded],
  );
  const [prefs, setPrefs] = useState<Preferences>({ perTerm: {} });
  const [stack, setStack] = useState<Card[]>([]);
  const stackRef = useRef<Card[]>([]);
  stackRef.current = stack;
  const topRef = useRef<HTMLDivElement>(null);
  /** Set when a pointerdown outside closed a card, so the click that follows does not reopen one. */
  const closedByPointer = useRef(false);
  /** Where focus goes after the next render. */
  const focusNext = useRef<HTMLElement | null>(null);
  /** Stack depth at the last render, to focus only newly opened cards. */
  const depth = useRef(0);

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
        // Remember the server-rendered (project default) wording before the first swap:
        // highlights anchor against it, so they survive a change of wording (task 031 D).
        el.dataset["default"] ??= el.textContent ?? "";
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

  /** A term's card data: from the page, or fetched from the public data files on demand. */
  const termData = useCallback(
    async (slug: string): Promise<DataTerm | undefined> => {
      const known = loaded.get(slug);
      if (known) return known;
      try {
        const res = await fetch(`/data/v1/terms/${slug}.json`);
        if (!res.ok) return undefined;
        const term = (await res.json()) as DataTerm;
        setLoaded((m) => new Map(m).set(slug, term));
        return term;
      } catch {
        return undefined;
      }
    },
    [loaded],
  );

  /** Closes the cards from `index` up; focus returns to the element that opened card `index`. */
  const closeFrom = useCallback((index: number) => {
    const current = stackRef.current;
    focusNext.current = current[index]?.opener ?? null;
    setStack(current.slice(0, index));
  }, []);

  // Focus moves after the render that removes the cards: until then the card below is inert.
  useEffect(() => {
    const el = focusNext.current;
    focusNext.current = null;
    if (el?.isConnected) el.focus();
  }, [stack]);

  // Term marks in the text open a fresh card; term links inside the top card open a nested one.
  // Marks are links (task 026): a modified or middle click still opens the vocabulary page.
  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const link = target?.closest<HTMLElement>("[data-term-link]");
      if (link && topRef.current?.contains(link)) {
        e.preventDefault();
        const slug = link.dataset["termLink"] ?? "";
        const current = stackRef.current;
        const already = current.findIndex((c) => c.term.term === slug);
        if (already !== -1) {
          // No loops: return to the card that is already open.
          setStack(current.slice(0, already + 1));
          return;
        }
        if (current.length >= MAX_CARDS) return;
        const term = await termData(slug);
        if (!term) return;
        setStack((s) => [
          ...s,
          { term, opener: link, inPlain: false, position: positionFor(link, s.at(-1)) },
        ]);
        return;
      }
      const button = target?.closest<HTMLElement>("a.term[data-term]");
      if (!button) return;
      const term = loaded.get(button.dataset["term"] ?? "");
      if (!term) return; // no card data: let the link open the vocabulary page
      e.preventDefault();
      if (closedByPointer.current) {
        closedByPointer.current = false;
        if (stackRef.current.length > 0) return; // that click only closed one of several cards
      }
      setStack([
        {
          term,
          opener: button,
          inPlain: Boolean(button.closest(".layer-plain")),
          position: positionFor(button),
        },
      ]);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [loaded, termData]);

  // Focus a newly opened card; Escape or a pointerdown outside the top card closes exactly one.
  useEffect(() => {
    if (stack.length > depth.current) topRef.current?.focus();
    depth.current = stack.length;
    if (stack.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      closeFrom(stackRef.current.length - 1);
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      const top = stackRef.current.at(-1);
      if (topRef.current?.contains(target) || top?.opener.contains(target)) return;
      closedByPointer.current = true;
      closeFrom(stackRef.current.length - 1);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [stack.length, closeFrom]);

  // Listen for global reset of terminology choices from Settings.
  useEffect(() => {
    const onReset = () => {
      const p = loadPreferences();
      setPrefs(p);
      apply(p);
    };
    window.addEventListener("plm:terms-reset", onReset);
    return () => window.removeEventListener("plm:terms-reset", onReset);
  }, [apply]);

  const top = stack.at(-1);
  const choiceFor = (t: DataTerm): TermChoice => {
    const file = files.get(t.term);
    return file ? resolveChoice(file, resolveContext(prefs)) : t.default;
  };

  const isOverridden = (slug: string) => prefs.perTerm[slug] !== undefined;
  const resetTerm = (slug: string) => {
    const next = Object.fromEntries(Object.entries(prefs.perTerm).filter(([k]) => k !== slug));
    update({ ...prefs, perTerm: next });
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
          Default (Plain)
        </button>
        <button
          type="button"
          aria-pressed={prefs.all === "original"}
          onClick={() => update({ ...prefs, all: "original" })}
        >
          Original (1848)
        </button>
      </div>

      {/* Dims the page; a tap on it is a tap outside, which closes one card. */}
      {stack.length > 0 && <div className="term-backdrop" aria-hidden="true" />}
      {stack.map((card, i) => {
        const isTop = i === stack.length - 1;
        return (
          <div
            key={`${i}-${card.term.term}`}
            ref={isTop ? topRef : undefined}
            className="term-card"
            data-level={i + 1}
            role="dialog"
            aria-label={`Term card ${i + 1} of ${stack.length}: ${nameOf(card.term)}`}
            tabIndex={-1}
            inert={!isTop}
            style={{ top: card.position.top, left: card.position.left, zIndex: 20 + i }}
          >
            {isTop && stack.length > 1 && (
              <nav className="term-trail" aria-label="Cards opened">
                {stack.slice(0, -1).map((c, j) => (
                  <span key={j}>
                    <button type="button" onClick={() => closeFrom(j + 1)}>
                      {nameOf(c.term)}
                    </button>
                    {" › "}
                  </span>
                ))}
                <span aria-current="true">{nameOf(card.term)}</span>
              </nav>
            )}
            <TermCardBody
              term={card.term}
              choice={choiceFor(card.term)}
              inPlain={card.inPlain}
              full={stack.length >= MAX_CARDS}
              appears={counts[card.term.term]}
              isOverridden={isOverridden(card.term.term)}
              onReset={() => resetTerm(card.term.term)}
              onChoose={(choice) =>
                update({ ...prefs, perTerm: { ...prefs.perTerm, [card.term.term]: choice } })
              }
            />
            <button
              type="button"
              className="term-card-close"
              onClick={() => closeFrom(i)}
              aria-label={i === 0 ? "Close" : "Close this card and the cards above it"}
            >
              ×
            </button>
          </div>
        );
      })}
      <p className="visually-hidden" aria-live="polite">
        {top ? `Term card ${stack.length} open: ${nameOf(top.term)}` : ""}
      </p>
    </>
  );
}

function TermCardBody({
  term,
  choice,
  inPlain,
  full,
  appears,
  isOverridden,
  onReset,
  onChoose,
}: {
  term: DataTerm;
  choice: TermChoice;
  inPlain: boolean;
  full: boolean;
  appears: number | undefined;
  isOverridden: boolean;
  onReset: () => void;
  onChoose: (choice: TermChoice) => void;
}) {
  const shown = term.renderings.find((r) => r.key === choice);
  const original = nameOf(term);
  const choosable = term.renderings.length > 1;
  const mode = { kind: "card", full } as const;
  return (
    <>
      <p className="term-card-name">{original}</p>
      {inPlain && choosable && (
        <p className="term-card-shown">
          Shown here as{" "}
          <strong>{choice === "original" ? original : (shown?.forms["sg"] ?? choice)}</strong>
        </p>
      )}
      <p>
        <TermShort term={term} mode={mode} />
      </p>
      <TermDetails term={term} mode={mode} />
      {inPlain && shown && choosable && (
        <div className="term-card-why">
          <p className="term-card-label">Why this wording?</p>
          <p>{shown.reason}</p>
          {shown.limitation && <p className="muted">Limitation: {shown.limitation}</p>}
        </div>
      )}
      {choosable && (
        <fieldset className="term-card-choices">
          <legend className="term-card-label">Alternative wordings (in-text occurrences)</legend>
          {term.renderings.map((r) => (
            <label key={r.key}>
              <input
                type="radio"
                name={`term-${term.term}`}
                checked={choice === r.key}
                onChange={() => onChoose(r.key)}
              />
              {r.forms["sg"] ?? r.key}
              {r.key === term.default ? " (default)" : ""}
              <span className="muted">
                {" "}
                · {r.usage === 1 ? "appears 1 time in texts" : `appears ${r.usage} times in texts`}
              </span>
            </label>
          ))}
          {isOverridden && (
            <button type="button" className="link-button term-card-reset" onClick={onReset}>
              Reset term to default
            </button>
          )}
        </fieldset>
      )}
      <p className="term-card-privacy muted">
        Choices are saved locally in your browser. No reading choices or votes are sent to any
        server.
      </p>
      <p className="term-card-more">
        <a href={`/vocabulary/${term.term}/`}>More about this term</a>
        {appears ? (
          <>
            {" · "}
            <a href={`/vocabulary/${term.term}/#appears`}>
              Appears {appears} {appears === 1 ? "time" : "times"} in the texts →
            </a>
          </>
        ) : null}
      </p>
    </>
  );
}
