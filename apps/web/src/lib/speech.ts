// Read-aloud helpers (task 031 E), kept pure so they are unit-tested.

export type Span = { start: number; end: number };

/** Speech is usable: the engine and utterances both exist (some browsers expose only one). */
export const canSpeak = () =>
  typeof window !== "undefined" &&
  typeof window.speechSynthesis?.speak === "function" &&
  typeof SpeechSynthesisUtterance === "function";

/** Sentences of a text as character ranges, trimmed, empty ones dropped. */
export function sentences(text: string): Span[] {
  const spans: Span[] = [];
  const add = (start: number, end: number) => {
    while (start < end && /\s/.test(text[start] ?? "")) start++;
    while (end > start && /\s/.test(text[end - 1] ?? "")) end--;
    if (end > start && /[\p{L}\p{N}]/u.test(text.slice(start, end))) spans.push({ start, end });
  };
  const Segmenter = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Segmenter) {
    for (const s of new Segmenter("en", { granularity: "sentence" }).segment(text))
      add(s.index, s.index + s.segment.length);
    return spans;
  }
  // Fallback: end at . ! ? (and closing quotes) followed by a space.
  const re = /[.!?]+["”’)]*\s+/g;
  let from = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    add(from, m.index + m[0].length);
    from = m.index + m[0].length;
  }
  add(from, text.length);
  return spans;
}

export type VoiceLike = { name: string; lang: string; localService: boolean; default?: boolean };

/** English voices first, voices on this device before online ones, then by name. */
export function orderVoices<V extends VoiceLike>(voices: readonly V[]): V[] {
  const rank = (v: V) => (v.lang.toLowerCase().startsWith("en") ? 0 : 2) + (v.localService ? 0 : 1);
  return [...voices].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

/** The voice to start with: the saved one if still there, else the best local English voice. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], saved: string): V | undefined {
  return voices.find((v) => v.name === saved) ?? orderVoices(voices)[0];
}

export const voiceLabel = (v: VoiceLike) =>
  `${v.name} (${v.lang})${v.localService ? "" : " · online voice"}`;

export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export type ListenLayer = "plain" | "original" | "context";

/** plm:listen — the player's settings, a persisted shape read with defaults. */
export type ListenPrefs = { voice: string; rate: number; next: boolean };

export function normalizeListen(raw: unknown): ListenPrefs {
  const p = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    voice: typeof p["voice"] === "string" ? p["voice"] : "",
    rate: RATES.includes(p["rate"] as (typeof RATES)[number]) ? (p["rate"] as number) : 1,
    next: p["next"] === true,
  };
}
