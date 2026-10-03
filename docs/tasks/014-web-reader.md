# Task 014 — Web reader: routes, modes, layout rendering

| | |
|---|---|
| **Status** | Done |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 013 |

## Goal
The core reading experience, as a fully static Next.js export (SDD §10.1, §12).

## Scope

**Routing**
- Routes mirror the source paths: `/archive/{…}/{document}.htm`.
- Verify early that the chosen static host serves `.htm` paths as HTML. If it doesn't, add a rename step (SDD §18).

**Rendering**
- Render the layout markup faithfully to the original layout. Never inject raw HTML.

**Reading modes**
- Original, Plain English and Parallel.
- In Parallel, scrolling stays in sync passage by passage. A rendering that covers several passages lines up with the whole group.
- `?view=` stores the current mode as client state. The canonical link is the bare path.

**Deep links**
- `#p00017` works in every mode.
- In Plain English, the link scrolls to the rendering that covers the passage and highlights it.

**States and labelling**
- Missing rendering: show "Plain English not yet available". The contribute link stays disabled until M2.
- Stale rendering: show a warning.
- Each layer gets its own typography and label.
- Every page has a "View original source" link and MIA attribution.

**No-JS support**
- Pre-render the text with default terms so pages work without JavaScript.

## Acceptance
- Ch. I renders in all three modes.
- Deep links work.
- Original and Plain English work with JavaScript disabled.
- Lighthouse LCP is under 2.5 s on the deployed preview.

## Notes (on completion)
- **Static Next.js 16 export.** Pages are server-rendered from `dist/data/v1` at build time.
- **One grid row per rendering.** The original passages a rendering covers sit beside it, so Parallel mode lines up by passage with no scroll syncing. Multi-passage renderings get one anchor per covered passage.
- **Modes.** `data-view` on `<html>` is set before first paint by an inline script, from `?view=`, then the remembered choice, then `plain`. Without JavaScript the page shows both layers (parallel on wide screens, stacked on narrow ones) and the mode switch is hidden.
- **Plain mode.** Untranslated runs fall back to the original, labelled once per run ("Original — no plain English yet").
- **`.htm` paths.** Next exports `ch01.htm.html` plus RSC payloads. `scripts/htm-paths.mjs` drops the payloads (the reader uses plain links) and renames the page to `ch01.htm`, which a local server delivers as `text/html`.
- **Verified in Chromium (Playwright).** All three modes work. Deep links `#p00009` scroll and highlight in every mode. There are no console errors. The page works without JavaScript and in a mobile viewport. **LCP is 1.1 s** with simulated slow 4G and 4× CPU slowdown, measured locally with PerformanceObserver. A Lighthouse run on the deployed preview is still due with task 017.
- CI and `pnpm check` now build the reader.
