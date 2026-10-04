"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentLayers } from "../lib/layers";
import { SPEECH_SKIP, layerText, toRange } from "../lib/layertext";
import { firstVisibleRow, readerRows } from "../lib/position";
import { readJson, writeJson } from "../lib/prefs";
import {
  RATES,
  canSpeak,
  normalizeListen,
  orderVoices,
  pickVoice,
  sentences,
  voiceLabel,
  type ListenLayer,
  type ListenPrefs,
} from "../lib/speech";

export const LISTEN_EVENT = "plm:listen";
const LISTEN_KEY = "plm:listen";
/** Set when "Continue to next chapter" moves on, so the next page keeps reading. */
const RESUME_KEY = "plm:listen:resume";

const CELL: Record<ListenLayer, string> = {
  plain: ".col-plain",
  original: ".col-original",
  context: ".col-context:not(.empty)",
};
const LAYER_NAME: Record<ListenLayer, string> = {
  plain: "Plain English",
  original: "Original",
  context: "Context",
};

type Pos = { row: number; sentence: number };

/**
 * Where listening starts: the passage the address points to (#p00009), if it
 * is on screen, since that is what the reader opened; otherwise the first
 * passage visible under the reader bar.
 */
function startRow(): number {
  const rows = readerRows();
  const target = location.hash
    ? document.getElementById(decodeURIComponent(location.hash.slice(1)))?.closest(".row")
    : null;
  const i = target ? rows.indexOf(target as HTMLElement) : -1;
  const box = target?.getBoundingClientRect();
  if (i >= 0 && box && box.bottom > 0 && box.top < window.innerHeight) return i;
  return firstVisibleRow(rows);
}

const highlights = () =>
  (globalThis.CSS as unknown as { highlights?: Map<string, unknown> })?.highlights;

/**
 * Read aloud (task 031 E) with the browser's own speech (Web Speech API): no
 * server, no cost. The reader picks one layer to listen to; layers are never
 * mixed. It speaks a sentence at a time, marking the passage and the sentence
 * being read and keeping them in view. Hidden where speech is not supported.
 */
export function ReadAloud({ next }: { next: string | null }) {
  const [supported, setSupported] = useState(false);
  const [open, setOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [layer, setLayer] = useState<ListenLayer>("plain");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [prefs, setPrefs] = useState<ListenPrefs>(normalizeListen(null));
  const [status, setStatus] = useState("");
  const pos = useRef<Pos | null>(null);
  /** Bumped on every start or stop, so callbacks from an older utterance are ignored. */
  const run = useRef(0);
  const live = useRef({ playing: false, layer, prefs, voices });
  live.current = { playing, layer, prefs, voices };

  useEffect(() => {
    if (!canSpeak()) return;
    setSupported(true);
    setPrefs(normalizeListen(readJson<unknown>(LISTEN_KEY, null)));
    const load = () => setVoices(orderVoices(speechSynthesis.getVoices()));
    load();
    speechSynthesis.addEventListener("voiceschanged", load);
    const stop = () => speechSynthesis.cancel();
    window.addEventListener("pagehide", stop);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", load);
      window.removeEventListener("pagehide", stop);
      speechSynthesis.cancel();
    };
  }, []);

  const savePrefs = (p: ListenPrefs) => {
    setPrefs(p);
    writeJson(LISTEN_KEY, p);
  };

  const clearMarks = () => {
    document.querySelectorAll<HTMLElement>(".row[data-reading]").forEach((r) => {
      delete r.dataset["reading"];
    });
    highlights()?.delete("tts-sentence");
  };

  const stop = useCallback(() => {
    run.current++;
    live.current.playing = false;
    speechSynthesis.cancel();
    setPlaying(false);
  }, []);

  const speakFrom = useCallback(
    (at: Pos) => {
      const token = run.current;
      const { layer: l, prefs: p, voices: vs } = live.current;
      const rows = readerRows();
      const row = rows[at.row];
      if (!row) {
        clearMarks();
        if (p.next && next) {
          try {
            sessionStorage.setItem(RESUME_KEY, l);
          } catch {
            // Without storage the next chapter opens without playing.
          }
          location.href = next;
        } else {
          stop();
          pos.current = null;
          setStatus("End of chapter.");
        }
        return;
      }
      const cell = row.querySelector(CELL[l]);
      // Plain English is missing in an untranslated row: skip it, never read the Original instead.
      const usable = cell && !(l === "plain" && row.classList.contains("untranslated"));
      const model = usable ? layerText(cell, SPEECH_SKIP) : null;
      const spans = model ? sentences(model.text) : [];
      const span = spans[at.sentence];
      if (!model || !span) {
        speakFrom({ row: at.row + 1, sentence: 0 });
        return;
      }
      pos.current = at;

      // Follow along: mark the passage and the sentence, and keep them in view.
      clearMarks();
      row.dataset["reading"] = "1";
      const range = toRange(model, span.start, span.end);
      const Ctor = (globalThis as unknown as { Highlight?: new (...r: Range[]) => unknown })
        .Highlight;
      if (range && Ctor) highlights()?.set("tts-sentence", new Ctor(range));
      const box = (range ?? row).getBoundingClientRect();
      if (box.top < 90 || box.bottom > window.innerHeight - 20)
        row.scrollIntoView({
          block: "center",
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        });

      const u = new SpeechSynthesisUtterance(model.text.slice(span.start, span.end));
      const voice = pickVoice(vs, p.voice);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? "en-GB";
      u.rate = p.rate;
      u.onend = () => {
        if (token === run.current && live.current.playing)
          speakFrom({ row: at.row, sentence: at.sentence + 1 });
      };
      u.onerror = (e) => {
        if (token !== run.current || e.error === "interrupted" || e.error === "canceled") return;
        stop();
        setStatus(
          e.error === "not-allowed"
            ? "Press play to keep listening."
            : "This voice could not read the text. Try another voice.",
        );
      };
      speechSynthesis.speak(u);
    },
    [next, stop],
  );

  const play = useCallback(
    (from?: Pos) => {
      speechSynthesis.cancel();
      run.current++;
      const start = from ?? pos.current ?? { row: startRow(), sentence: 0 };
      live.current.playing = true;
      setPlaying(true);
      setStatus("");
      speakFrom(start);
    },
    [speakFrom],
  );

  const pause = () => {
    stop();
    setStatus("Paused.");
  };

  const step = (by: number) => {
    const rows = readerRows();
    const here = pos.current?.row ?? firstVisibleRow(rows);
    const to = { row: Math.min(Math.max(here + by, 0), rows.length - 1), sentence: 0 };
    pos.current = to;
    if (live.current.playing) play(to);
    else rows[to.row]?.scrollIntoView({ block: "center" });
  };

  const openWith = useCallback((l?: ListenLayer) => {
    const shown = currentLayers();
    const chosen = l ?? shown.find((x) => x !== "context") ?? shown[0] ?? "plain";
    // Also set now: a play() scheduled right after must not read the old layer.
    live.current.layer = chosen;
    // Start where the reader is now: the player adds a row to the sticky bar, which
    // would otherwise cover a short passage and make Play start at the next one.
    pos.current ??= { row: startRow(), sentence: 0 };
    setLayer(chosen);
    setOpen(true);
  }, []);

  // "Listen from here" in the passage actions; and carrying on from the last chapter.
  useEffect(() => {
    if (!supported) return;
    const onListen = (e: Event) => {
      const id = String((e as CustomEvent).detail ?? "");
      const index = readerRows().findIndex((r) => r.id === id);
      openWith();
      if (index >= 0) window.setTimeout(() => play({ row: index, sentence: 0 }), 0);
    };
    window.addEventListener(LISTEN_EVENT, onListen);
    let resume: string | null = null;
    try {
      resume = sessionStorage.getItem(RESUME_KEY);
      sessionStorage.removeItem(RESUME_KEY);
    } catch {
      // No storage: nothing to resume.
    }
    if (resume === "plain" || resume === "original" || resume === "context") {
      openWith(resume);
      window.setTimeout(() => play({ row: 0, sentence: 0 }), 0);
    }
    return () => window.removeEventListener(LISTEN_EVENT, onListen);
  }, [supported, openWith, play]);

  // Settings changed while playing: start the current sentence again with them.
  const restart = () => {
    if (live.current.playing && pos.current)
      window.setTimeout(() => play(pos.current ?? undefined), 0);
  };

  if (!supported) return null;
  const voice = pickVoice(voices, prefs.voice);
  return (
    <>
      <button
        type="button"
        className="toc-button listen-button"
        aria-expanded={open}
        aria-controls="listen-player"
        onClick={() => {
          if (open) {
            stop();
            clearMarks();
            setOpen(false);
            pos.current = null; // next time, start from wherever the reader is then
          } else openWith();
        }}
      >
        <svg
          className="bar-icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 9v6h4l5 4V5L8 9H4z" />
          <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
        </svg>
        <span className="bar-text">Listen</span>
      </button>
      {open && (
        <div id="listen-player" className="listen-player" role="region" aria-label="Read aloud">
          <label>
            Read{" "}
            <select
              value={layer}
              onChange={(e) => {
                stop();
                // The same passage, from its start, in the newly chosen layer.
                if (pos.current) pos.current = { row: pos.current.row, sentence: 0 };
                setLayer(e.target.value as ListenLayer);
              }}
            >
              {(Object.keys(LAYER_NAME) as ListenLayer[]).map((l) => (
                <option key={l} value={l}>
                  {LAYER_NAME[l]}
                </option>
              ))}
            </select>
          </label>
          <span className="listen-controls">
            <button type="button" aria-label="Previous passage" onClick={() => step(-1)}>
              {"⏮︎"}
            </button>
            <button
              type="button"
              className="listen-play"
              aria-label={playing ? "Pause" : "Play"}
              onClick={() => (playing ? pause() : play())}
            >
              {playing ? "⏸︎" : "▶︎"}
            </button>
            <button type="button" aria-label="Next passage" onClick={() => step(1)}>
              {"⏭︎"}
            </button>
          </span>
          <label>
            Speed{" "}
            <select
              value={prefs.rate}
              onChange={(e) => {
                savePrefs({ ...prefs, rate: Number(e.target.value) });
                restart();
              }}
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
          </label>
          <label>
            Voice{" "}
            <select
              value={voice?.name ?? ""}
              onChange={(e) => {
                savePrefs({ ...prefs, voice: e.target.value });
                restart();
              }}
            >
              {voices.length === 0 && <option value="">Browser default</option>}
              {voices.map((v) => (
                <option key={v.voiceURI || v.name} value={v.name}>
                  {voiceLabel(v)}
                </option>
              ))}
            </select>
          </label>
          <label className="listen-next">
            <input
              type="checkbox"
              checked={prefs.next}
              onChange={(e) => savePrefs({ ...prefs, next: e.target.checked })}
            />{" "}
            Continue to next chapter
          </label>
          {voice && !voice.localService && (
            <p className="listen-note">
              This is an online voice: your browser may send the text to a speech service. Voices
              without “online” stay on this device.
            </p>
          )}
          <p className="listen-status" role="status">
            {status}
          </p>
        </div>
      )}
    </>
  );
}
