// Reader preferences live only in this browser (SDD §12): no account, no server.
// Every access is wrapped, because storage can be unavailable (private mode,
// blocked site data); the reader then simply uses defaults.
//
// plm:prefs is a persisted shape. Fields are only ever added, and every field
// is read through normalizePrefs with a default, so prefs saved by an older
// reader still load. Task 031 B replaced size "s" | "m" | "l" | "xl" with a
// pixel size; the old values map to the nearest size.

import { LAYERS_BOOT } from "./layers";

export const THEMES = ["system", "light", "sepia", "dark", "black"] as const;
export const FONTS = ["sans", "serif", "atkinson", "dyslexic"] as const;
export const LEADINGS = ["compact", "normal", "relaxed", "loose"] as const;
export const WIDTHS = ["narrow", "medium", "wide"] as const;
export const MARGINS = ["small", "medium", "large"] as const;
export const PARAS = ["spaced", "indented"] as const;
export const ALIGNS = ["left", "justify"] as const;
export const WPMS = [150, 200, 250, 300] as const;
export const SIZE_MIN = 14;
export const SIZE_MAX = 28;

export type ReaderPrefs = {
  theme: (typeof THEMES)[number];
  /** Face for Plain English and Context; the Original keeps the book serif. */
  font: (typeof FONTS)[number];
  /** Text size in CSS px at 100% zoom. */
  size: number;
  leading: (typeof LEADINGS)[number];
  width: (typeof WIDTHS)[number];
  margins: (typeof MARGINS)[number];
  para: (typeof PARAS)[number];
  align: (typeof ALIGNS)[number];
  wpm: (typeof WPMS)[number];
  terms: "on" | "off";
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "system",
  font: "sans",
  size: 17,
  leading: "normal",
  width: "medium",
  margins: "medium",
  para: "spaced",
  align: "left",
  wpm: 200,
  terms: "on",
};
export const PREFS_KEY = "plm:prefs";
export const BOOKMARKS_KEY = "plm:bookmarks";
/** Dispatched on window when the reader changes a preference. */
export const PREFS_EVENT = "plm:prefs";
/** Pre-031 named sizes (93.75%, 100%, 112.5%, 125% of 17px), to the nearest px. */
export const OLD_SIZES: Record<string, number> = { s: 16, m: 17, l: 19, xl: 21 };

const pick = <T extends string | number>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

/** Whatever is stored (any version, partial, garbage) → complete current prefs. Never throws. */
export function normalizePrefs(raw: unknown): ReaderPrefs {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d = DEFAULT_PREFS;
  const size =
    typeof p["size"] === "number" && Number.isFinite(p["size"])
      ? Math.round(Math.min(SIZE_MAX, Math.max(SIZE_MIN, p["size"])))
      : (OLD_SIZES[String(p["size"])] ?? d.size);
  return {
    theme: pick(THEMES, p["theme"], d.theme),
    font: pick(FONTS, p["font"], d.font),
    size,
    leading: pick(LEADINGS, p["leading"], d.leading),
    width: pick(WIDTHS, p["width"], d.width),
    margins: pick(MARGINS, p["margins"], d.margins),
    para: pick(PARAS, p["para"], d.para),
    align: pick(ALIGNS, p["align"], d.align),
    wpm: pick(WPMS, p["wpm"], d.wpm),
    terms: p["terms"] === "off" ? "off" : "on",
  };
}

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

export const readPrefs = (): ReaderPrefs => normalizePrefs(readJson<unknown>(PREFS_KEY, null));

type Root = { dataset: DOMStringMap; style: Pick<CSSStyleDeclaration, "setProperty"> };

/** Mirrors preferences onto <html>: data attributes and the --text-size variable, which the CSS reads. */
export function applyPrefs(p: ReaderPrefs, html: Root = document.documentElement): void {
  if (p.theme === "system") delete html.dataset["theme"];
  else html.dataset["theme"] = p.theme;
  html.style.setProperty("--text-size", String(p.size));
  html.dataset["font"] = p.font;
  html.dataset["leading"] = p.leading;
  html.dataset["width"] = p.width;
  html.dataset["margins"] = p.margins;
  html.dataset["para"] = p.para;
  html.dataset["align"] = p.align;
  html.dataset["terms"] = p.terms;
}

export type Bookmark = { path: string; title: string; passage: string; snippet: string };

/**
 * Inlined in <head> so the reading mode and preferences apply before first
 * paint (no flash). Kept dependency-free and defensive. It must set the same
 * values as applyPrefs(normalizePrefs(…)); prefs.test.ts checks that.
 */
export const BOOT_SCRIPT = `(function(){var d=document.documentElement;try{${LAYERS_BOOT}var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}")||{};var o=function(l,v,f){return l.indexOf(v)>=0?v:f};if(${JSON.stringify(THEMES.slice(1))}.indexOf(p.theme)>=0){d.dataset.theme=p.theme}var s=typeof p.size==="number"&&isFinite(p.size)?Math.round(Math.min(${SIZE_MAX},Math.max(${SIZE_MIN},p.size))):(${JSON.stringify(OLD_SIZES)})[p.size]||${DEFAULT_PREFS.size};d.style.setProperty("--text-size",String(s));d.dataset.font=o(${JSON.stringify(FONTS)},p.font,"${DEFAULT_PREFS.font}");d.dataset.leading=o(${JSON.stringify(LEADINGS)},p.leading,"${DEFAULT_PREFS.leading}");d.dataset.width=o(${JSON.stringify(WIDTHS)},p.width,"${DEFAULT_PREFS.width}");d.dataset.margins=o(${JSON.stringify(MARGINS)},p.margins,"${DEFAULT_PREFS.margins}");d.dataset.para=o(${JSON.stringify(PARAS)},p.para,"${DEFAULT_PREFS.para}");d.dataset.align=o(${JSON.stringify(ALIGNS)},p.align,"${DEFAULT_PREFS.align}");d.dataset.terms=p.terms==="off"?"off":"on"}catch(e){d.dataset.layers="plain";d.dataset.cols="1"}})();`;
