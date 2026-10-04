// Quote cards (task 032 E): a quote drawn as an image for sharing, like the
// verse images of a Bible app, always with where it comes from. A card from the
// Plain English says it is our version, never the author's wording.
//
// Layout is pure (it takes a text-measuring function), so it is unit-tested;
// drawCard does the canvas work in the browser.

import type { MarkLayer } from "./annotations";
import type { CitationMeta } from "./citation";

export type Measure = (text: string, size: number) => number;

/** Greedy word wrap. A word longer than the line goes on a line of its own. */
export function wrap(text: string, width: number, size: number, measure: Measure): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size) > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export type Fit = { size: number; lines: string[]; shortened: boolean };

/**
 * The largest type size (from `max` down to `min`) at which the quote fits in
 * `height`. If it does not fit even at `min`, it is cut at a word and marked
 * shortened, so the card never pretends to quote words it leaves out.
 */
export function fitQuote(
  text: string,
  box: { width: number; height: number },
  measure: Measure,
  { max = 64, min = 30, leading = 1.35 } = {},
): Fit {
  for (let size = max; size >= min; size -= 2) {
    const lines = wrap(text, box.width, size, measure);
    if (lines.length * size * leading <= box.height) return { size, lines, shortened: false };
  }
  const room = Math.max(1, Math.floor(box.height / (min * leading)));
  const lines = wrap(text, box.width, min, measure).slice(0, room);
  const last = lines.at(-1) ?? "";
  lines[lines.length - 1] = `${last.replace(/[\s,;:.—–-]+$/, "")} …`;
  return { size: min, lines, shortened: true };
}

export type CardTheme = "light" | "sepia" | "dark";
export const CARD_THEMES: Record<
  CardTheme,
  { bg: string; fg: string; muted: string; accent: string; rule: string }
> = {
  light: { bg: "#fdfcf8", fg: "#1d1b16", muted: "#6b665a", accent: "#8a1c1c", rule: "#e4e0d5" },
  sepia: { bg: "#f4ecd8", fg: "#33291a", muted: "#65553c", accent: "#842511", rule: "#dccca8" },
  dark: { bg: "#171612", fg: "#ebe7dc", muted: "#a39d8f", accent: "#e28b7b", rule: "#34312a" },
};

/** The words on a card besides the quote: what it is, the reference, and the source. */
export function cardLabels(meta: CitationMeta, layer: MarkLayer, reference: string) {
  const work = `${meta.authors}, ${meta.work} (${meta.year})`;
  return layer === "plain"
    ? {
        kind: "PLAIN ENGLISH VERSION",
        reference,
        source: `Plain English version by Plain Language Marxist, not the original wording. Based on ${work}.`,
      }
    : {
        kind: "ORIGINAL TEXT",
        reference,
        source: `${work}${meta.translator ? `, translated by ${meta.translator}${meta.translationYear ? ` (${meta.translationYear})` : ""}` : ""}.`,
      };
}

export const CARD_SIZE = 1080;
const PAD = 96;
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';

/** Draws a square card. Returns the full text on it, for alt text and sharing. */
export function drawCard(
  canvas: HTMLCanvasElement,
  card: { quote: string; layer: MarkLayer; meta: CitationMeta; reference: string; site: string },
  theme: CardTheme,
): { alt: string; shortened: boolean } {
  const ctx = canvas.getContext("2d");
  canvas.width = canvas.height = CARD_SIZE;
  if (!ctx) return { alt: card.quote, shortened: false };
  const c = CARD_THEMES[theme];
  const face = card.layer === "original" ? SERIF : SANS;
  const labels = cardLabels(card.meta, card.layer, card.reference);
  const width = CARD_SIZE - 2 * PAD;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
  ctx.fillStyle = c.accent;
  ctx.fillRect(PAD, PAD, 6, 54);
  ctx.textBaseline = "top";
  ctx.font = `600 26px ${SANS}`;
  ctx.fillText(labels.kind, PAD + 24, PAD + 2);
  ctx.fillStyle = c.muted;
  ctx.font = `400 26px ${SANS}`;
  ctx.fillText(labels.reference, PAD + 24, PAD + 32);

  // The source, wrapped, measured first: the quote gets the room above it.
  const sourceSize = 26;
  const measureFace = (font: string) => (t: string, size: number) => {
    ctx.font = `${size}px ${font}`;
    return ctx.measureText(t).width;
  };
  const sourceLines = wrap(labels.source, width, sourceSize, measureFace(SANS));
  const footer = (sourceLines.length + 1) * sourceSize * 1.4 + 40;
  const top = PAD + 120;
  const fit = fitQuote(
    `“${card.quote.trim()}”`,
    { width, height: CARD_SIZE - PAD - footer - top },
    measureFace(face),
  );

  ctx.fillStyle = c.fg;
  ctx.font = `${fit.size}px ${face}`;
  fit.lines.forEach((l, i) => ctx.fillText(l, PAD, top + i * fit.size * 1.35));

  let y = CARD_SIZE - PAD - footer + 24;
  ctx.fillStyle = c.rule;
  ctx.fillRect(PAD, y - 20, width, 2);
  ctx.fillStyle = c.muted;
  ctx.font = `${sourceSize}px ${SANS}`;
  for (const l of sourceLines) {
    ctx.fillText(l, PAD, y);
    y += sourceSize * 1.4;
  }
  ctx.fillStyle = c.accent;
  ctx.font = `600 ${sourceSize}px ${SANS}`;
  ctx.fillText(card.site, PAD, y);

  // "Plain English version: “…” Manifesto I.13. <source> <site>"
  const kind = labels.kind === "ORIGINAL TEXT" ? "Original text" : "Plain English version";
  const shortened = fit.shortened ? " (shortened on the card)" : "";
  const alt = `${kind}: “${card.quote.trim()}”${shortened} ${labels.reference}. ${labels.source} ${card.site}`;
  return { alt, shortened: fit.shortened };
}
