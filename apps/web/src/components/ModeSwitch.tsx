"use client";

import { useEffect, useState } from "react";

export type View = "plain" | "original" | "parallel";
const VIEWS: { value: View; label: string }[] = [
  { value: "plain", label: "Plain English" },
  { value: "original", label: "Original" },
  { value: "parallel", label: "Parallel" },
];
const STORAGE_KEY = "plm:view";

/**
 * Switches the reading mode by setting data-view on <html>. The mode is client
 * state (?view=… and a remembered preference); the canonical URL never changes
 * (SDD §10.1). Without JavaScript the page shows both layers.
 */
export function ModeSwitch() {
  const [view, setView] = useState<View | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset["view"];
    if (current === "plain" || current === "original" || current === "parallel") setView(current);
  }, []);

  const choose = (next: View) => {
    setView(next);
    document.documentElement.dataset["view"] = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the mode still applies to this page.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("view", next);
    window.history.replaceState(null, "", url);
  };

  return (
    <div className="mode-switch" role="group" aria-label="Reading mode">
      {VIEWS.map((v) => (
        <button
          key={v.value}
          type="button"
          aria-pressed={view === v.value}
          onClick={() => choose(v.value)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
