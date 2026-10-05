"use client";

import { useEffect, useRef, useState } from "react";
import { onShortcut } from "./Shortcuts";
import {
  AIDS,
  ALIGNS,
  NUMBERS,
  DEFAULT_PREFS,
  FONTS,
  LEADINGS,
  MARGINS,
  PARAS,
  PREFS_EVENT,
  SIZE_MAX,
  SIZE_MIN,
  THEMES,
  WIDTHS,
  WPMS,
  SWITCH,
  readPrefs,
  savePrefs,
  type ReaderPrefs,
} from "../lib/prefs";

type Choice = {
  [K in keyof ReaderPrefs]: {
    key: K;
    label: string;
    hint?: string;
    options: Record<string, string>;
  };
}[keyof ReaderPrefs];

const labels = <T extends string | number>(values: readonly T[], names: string[]) =>
  Object.fromEntries(values.map((v, i) => [String(v), names[i] ?? String(v)]));

const CHOICES: Choice[] = [
  {
    key: "theme",
    label: "Theme",
    options: labels(THEMES, ["System", "Light", "Sepia", "Dark", "Black"]),
  },
  {
    key: "font",
    label: "Font",
    hint: "For Plain English and Context. The Original keeps its book face.",
    options: labels(FONTS, ["Sans", "Book serif", "Atkinson Hyperlegible", "OpenDyslexic"]),
  },
  {
    key: "leading",
    label: "Line spacing",
    options: labels(LEADINGS, ["Compact", "Normal", "Relaxed", "Loose"]),
  },
  {
    key: "width",
    label: "Line width",
    hint: "When one layer is shown.",
    options: labels(WIDTHS, ["Narrow", "Medium", "Wide"]),
  },
  { key: "margins", label: "Margins", options: labels(MARGINS, ["Small", "Medium", "Large"]) },
  {
    key: "para",
    label: "Paragraphs",
    hint: "Book style indents first lines, when one layer is shown.",
    options: labels(PARAS, ["Spaced", "Book style"]),
  },
  { key: "align", label: "Alignment", options: labels(ALIGNS, ["Left", "Justified"]) },
  {
    key: "wpm",
    label: "Reading speed",
    hint: "Words a minute, for the time left.",
    options: labels(WPMS, ["150", "200", "250", "300"]),
  },
  { key: "terms", label: "Term underlines", options: { on: "Show", off: "Hide" } },
  {
    key: "aid",
    label: "Reading aid",
    hint: "Paragraph focus dims all but the passage you are reading; the ruler is a band that follows the pointer.",
    options: labels(AIDS, ["None", "Paragraph focus", "Reading ruler"]),
  },
  {
    key: "screen",
    label: "Keep screen on",
    hint: "While a chapter is open. Only in browsers that support it.",
    options: labels(SWITCH, ["Off", "On"]),
  },
  {
    key: "numbers",
    label: "Passage numbers",
    hint: "Numbers like II.17 for citing. Auto shows them when two or more layers are on.",
    options: labels(NUMBERS, ["Auto", "Show", "Hide"]),
  },
  {
    key: "shortcuts",
    label: "Keyboard shortcuts",
    hint: "Single keys such as t and f. Press ? to list them.",
    options: labels(SWITCH, ["Off", "On"]),
  },
];

/** Site-wide reading preferences (SDD §12, task 031 B), kept in this browser only. */
export function ReaderSettings() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(() => setPrefs(readPrefs()), []);

  // Escape, a click or tap outside, or focus moving elsewhere closes the panel.
  useEffect(() => {
    if (!open) return;
    const inside = (n: EventTarget | null) =>
      n instanceof Node && (panel.current?.contains(n) || toggle.current?.contains(n));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!inside(e.target)) setOpen(false);
    };
    const onFocus = (e: FocusEvent) => {
      if (!inside(e.target)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  const save = (next: ReaderPrefs) => {
    setPrefs(next);
    savePrefs(next);
  };
  /** Changes one setting on top of what is stored now: other controls (focus mode) also write prefs. */
  const set = (key: keyof ReaderPrefs, value: string | number) =>
    save({
      ...readPrefs(),
      [key]: key === "wpm" || key === "size" ? Number(value) : value,
    } as ReaderPrefs);

  // Keep in step when another control changes a preference.
  useEffect(() => {
    const sync = () => setPrefs(readPrefs());
    window.addEventListener(PREFS_EVENT, sync);
    return () => window.removeEventListener(PREFS_EVENT, sync);
  }, []);

  // "s" opens the panel and moves into it.
  useEffect(
    () =>
      onShortcut("settings", () => {
        setOpen(true);
        window.setTimeout(() => panel.current?.querySelector<HTMLElement>("input")?.focus(), 0);
      }),
    [],
  );

  return (
    <div className="settings">
      <button
        ref={toggle}
        type="button"
        className="settings-toggle"
        aria-expanded={open}
        aria-controls="reader-settings"
        onClick={() => setOpen(!open)}
      >
        Settings
      </button>
      {open && (
        <div
          ref={panel}
          id="reader-settings"
          className="settings-panel"
          role="region"
          aria-label="Reading settings"
        >
          {/* Live preview: the same rules as the reader, in miniature. */}
          <div className="settings-preview" aria-label="Preview" role="group">
            <div className="layer-plain">
              <span className="layer-label">Plain English</span>
              <p className="block">
                A ghost is haunting Europe — the ghost of communism. All the powers of old Europe
                have joined in a holy alliance to drive out this ghost.
              </p>
            </div>
            <div className="layer-original">
              <span className="layer-label">Original</span>
              <p className="block">
                A spectre is haunting Europe — the spectre of communism. All the powers of old
                Europe have entered into a holy alliance to exorcise this spectre.
              </p>
            </div>
          </div>

          <div className="settings-size">
            <label htmlFor="pref-size">
              Text size <output htmlFor="pref-size">{prefs.size} px</output>
            </label>
            <input
              id="pref-size"
              type="range"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={1}
              value={prefs.size}
              onChange={(e) => set("size", e.target.value)}
            />
          </div>

          {CHOICES.filter((c) => c.key !== "screen" || "wakeLock" in navigator).map((c) => (
            <fieldset key={c.key} aria-describedby={c.hint ? `pref-${c.key}-hint` : undefined}>
              <legend>{c.label}</legend>
              <div className="choices">
                {Object.entries(c.options).map(([value, label]) => (
                  <label key={value}>
                    <input
                      type="radio"
                      name={`pref-${c.key}`}
                      value={value}
                      checked={String(prefs[c.key]) === value}
                      onChange={() => set(c.key, value)}
                    />
                    {label}
                  </label>
                ))}
              </div>
              {c.hint && (
                <p id={`pref-${c.key}-hint`} className="settings-hint">
                  {c.hint}
                </p>
              )}
            </fieldset>
          ))}
          <p className="settings-foot">
            <button type="button" className="link-button" onClick={() => save(DEFAULT_PREFS)}>
              Reset to defaults
            </button>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                try {
                  localStorage.removeItem("plm:terms");
                  window.dispatchEvent(new Event("plm:terms-reset"));
                } catch {
                  // Storage unavailable
                }
              }}
            >
              Reset all terminology choices
            </button>
            <span className="muted">Saved in this browser only.</span>
          </p>
        </div>
      )}
    </div>
  );
}
