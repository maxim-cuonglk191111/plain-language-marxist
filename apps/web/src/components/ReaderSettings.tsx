"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_PREFS,
  PREFS_KEY,
  applyPrefs,
  readJson,
  writeJson,
  type ReaderPrefs,
} from "../lib/prefs";

type Option<K extends keyof ReaderPrefs> = { value: ReaderPrefs[K]; label: string };

const GROUPS: { key: keyof ReaderPrefs; label: string; options: Option<keyof ReaderPrefs>[] }[] = [
  {
    key: "theme",
    label: "Theme",
    options: [
      { value: "system", label: "System" },
      { value: "light", label: "Light" },
      { value: "dark", label: "Dark" },
    ],
  },
  {
    key: "size",
    label: "Text size",
    options: [
      { value: "s", label: "Small" },
      { value: "m", label: "Medium" },
      { value: "l", label: "Large" },
      { value: "xl", label: "Extra large" },
    ],
  },
  {
    key: "leading",
    label: "Line spacing",
    options: [
      { value: "normal", label: "Normal" },
      { value: "relaxed", label: "Relaxed" },
    ],
  },
  {
    key: "terms",
    label: "Term underlines",
    options: [
      { value: "on", label: "Show" },
      { value: "off", label: "Hide" },
    ],
  },
];

/** Site-wide reading preferences (SDD §12), kept in this browser only. */
export function ReaderSettings() {
  const [prefs, setPrefs] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);

  useEffect(
    () => setPrefs({ ...DEFAULT_PREFS, ...readJson<Partial<ReaderPrefs>>(PREFS_KEY, {}) }),
    [],
  );

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

  const set = (key: keyof ReaderPrefs, value: string) => {
    const next = { ...prefs, [key]: value } as ReaderPrefs;
    setPrefs(next);
    writeJson(PREFS_KEY, next);
    applyPrefs(next);
  };

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
          {GROUPS.map((group) => (
            <fieldset key={group.key}>
              <legend>{group.label}</legend>
              {group.options.map((o) => (
                <label key={o.value}>
                  <input
                    type="radio"
                    name={`pref-${group.key}`}
                    value={o.value}
                    checked={prefs[group.key] === o.value}
                    onChange={() => set(group.key, o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </fieldset>
          ))}
          <p className="muted">Saved in this browser only.</p>
        </div>
      )}
    </div>
  );
}
