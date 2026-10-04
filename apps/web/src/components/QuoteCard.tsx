"use client";

import { useEffect, useRef, useState } from "react";
import type { MarkLayer } from "../lib/annotations";
import type { CitationMeta } from "../lib/citation";
import { drawCard, type CardTheme } from "../lib/quotecard";

/** What to put on the card: the words in each layer on offer, and where they are from. */
export type QuoteRequest = {
  quotes: Partial<Record<MarkLayer, string>>;
  reference: string;
};

const LAYER_NAME: Record<MarkLayer, string> = { plain: "Plain English", original: "Original" };

/** The card style that matches the reader's theme. */
function startTheme(): CardTheme {
  const t = document.documentElement.dataset["theme"];
  if (t === "sepia") return "sepia";
  if (t === "dark" || t === "black") return "dark";
  if (!t && matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  return "light";
}

/**
 * Make a quote card (task 032 E): the quote drawn as a square image, with its
 * reference and source, to download or share. Everything is drawn in the
 * browser; nothing is sent anywhere until the reader shares it themselves.
 */
export function QuoteCard({
  request,
  meta,
  onClose,
}: {
  request: QuoteRequest | null;
  meta: CitationMeta;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<CardTheme>("light");
  const [layer, setLayer] = useState<MarkLayer>("plain");
  const [alt, setAlt] = useState("");
  const [canShare, setCanShare] = useState(false);
  const layers = (["plain", "original"] as const).filter((l) => request?.quotes[l]);

  useEffect(() => {
    const d = dialog.current;
    if (request && d && !d.open) {
      setTheme(startTheme());
      setLayer(layers[0] ?? "plain");
      d.showModal();
    }
    if (!request && d?.open) d.close();
  }, [request]); // layers is derived from request

  // Draw (again) when the card's content or style changes, once fonts are ready.
  useEffect(() => {
    const quote = request?.quotes[layer];
    const c = canvas.current;
    if (!request || !quote || !c) return;
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      const drawn = drawCard(
        c,
        { quote, layer, meta, reference: request.reference, site: location.host },
        theme,
      );
      setAlt(drawn.alt);
      c.toBlob((blob) => {
        if (!blob || cancelled) return;
        const file = new File([blob], fileName(request.reference), { type: "image/png" });
        setCanShare(Boolean(navigator.canShare?.({ files: [file] })));
      }, "image/png");
    });
    return () => {
      cancelled = true;
    };
  }, [request, layer, theme, meta]);

  const withBlob = (use: (blob: Blob) => void) =>
    canvas.current?.toBlob((b) => b && use(b), "image/png");
  const download = () =>
    withBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName(request?.reference ?? "quote");
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
  const share = () =>
    withBlob((blob) => {
      const file = new File([blob], fileName(request?.reference ?? "quote"), { type: "image/png" });
      // The card's words go along as text, so they can be read without the image.
      void navigator
        .share({ files: [file], text: alt, title: request?.reference ?? "" })
        .catch(() => {});
    });

  return (
    <dialog
      ref={dialog}
      className="note-dialog quote-dialog"
      aria-labelledby="quote-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) dialog.current?.close();
      }}
    >
      {request && (
        <>
          <h2 id="quote-title">Quote card</h2>
          <canvas ref={canvas} className="quote-canvas" role="img" aria-label={alt} />
          {layers.length > 1 && (
            <fieldset className="quote-options">
              <legend>Text</legend>
              {layers.map((l) => (
                <label key={l}>
                  <input
                    type="radio"
                    name="quote-layer"
                    checked={layer === l}
                    onChange={() => setLayer(l)}
                  />
                  {LAYER_NAME[l]}
                </label>
              ))}
            </fieldset>
          )}
          <fieldset className="quote-options">
            <legend>Style</legend>
            {(["light", "sepia", "dark"] as const).map((t) => (
              <label key={t}>
                <input
                  type="radio"
                  name="quote-theme"
                  checked={theme === t}
                  onChange={() => setTheme(t)}
                />
                {t[0]?.toUpperCase() + t.slice(1)}
              </label>
            ))}
          </fieldset>
          {layer === "plain" && (
            <p className="muted small">
              The card says this is our Plain English version, not the original wording.
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="primary" onClick={download}>
              Download image
            </button>
            {canShare && (
              <button type="button" onClick={share}>
                Share
              </button>
            )}
            <button type="button" onClick={() => dialog.current?.close()}>
              Close
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

/** "Manifesto I.9" → "manifesto-I-9.png" */
const fileName = (reference: string) =>
  `${reference
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .replace(/^\w+/, (w) => w.toLowerCase())}.png`;
