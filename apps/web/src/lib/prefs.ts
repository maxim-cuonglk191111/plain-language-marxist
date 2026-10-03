// Reader preferences live only in this browser (SDD §12): no account, no server.
// Every access is wrapped, because storage can be unavailable (private mode,
// blocked site data); the reader then simply uses defaults.

export type ReaderPrefs = {
  theme: "system" | "light" | "dark";
  size: "s" | "m" | "l" | "xl";
  leading: "normal" | "relaxed";
  terms: "on" | "off";
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "system",
  size: "m",
  leading: "normal",
  terms: "on",
};
export const PREFS_KEY = "plm:prefs";
export const BOOKMARKS_KEY = "plm:bookmarks";
export const progressKey = (path: string) => `plm:progress:${path}`;

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Unavailable storage: the change applies to this page only.
  }
}

/** Mirrors preferences onto <html> data attributes, which the CSS reads. */
export function applyPrefs(p: ReaderPrefs): void {
  const html = document.documentElement;
  if (p.theme === "system") delete html.dataset["theme"];
  else html.dataset["theme"] = p.theme;
  html.dataset["size"] = p.size;
  html.dataset["leading"] = p.leading;
  html.dataset["terms"] = p.terms;
}

export type Bookmark = { path: string; title: string; passage: string; snippet: string };

/**
 * Inlined in <head> so the reading mode and preferences apply before first
 * paint (no flash). Kept dependency-free and defensive.
 */
export const BOOT_SCRIPT = `(function(){var d=document.documentElement;try{var v=new URLSearchParams(location.search).get("view");var ok=function(x){return x==="plain"||x==="original"||x==="parallel"};if(!ok(v)){v=localStorage.getItem("plm:view")}d.dataset.view=ok(v)?v:"plain";var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");if(p.theme==="light"||p.theme==="dark"){d.dataset.theme=p.theme}d.dataset.size=p.size||"m";d.dataset.leading=p.leading||"normal";d.dataset.terms=p.terms||"on"}catch(e){d.dataset.view="plain"}})();`;
