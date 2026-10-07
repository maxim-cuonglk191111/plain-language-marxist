# Task 060 — Reader Settings UX, Sticky Header Integration, and English Translation Quality Audit

|                |                                                                  |
| -------------- | ---------------------------------------------------------------- |
| **Status**     | Done                                                             |
| **Filed**      | 2026-10-07                                                       |
| **Owner**      | Unassigned                                                       |
| **Severity**   | Medium (reader usability, setting accessibility, end-of-chapter focus) |
| **Milestone**  | M1/M3 (reader polish & source foundation)                        |
| **Depends on** | 031 (e-book reader experience), 057 (pedagogical reading paths)  |
| **Related**    | 023 (three-layer reader), 036 (terminology UI)                   |

## Problem

1. **Mid-Chapter Setting Inaccessibility:**
   Settings was previously mounted inside the top `.site-header`. When readers were deep into long chapters (thousands of pixels down) or when Focus Mode was active (`html[data-focus="on"]`, which sets `.site-header { display: none; }`), altering reader appearance required scrolling all the way back to the top or leaving focus mode.
2. **Settings Panel Layout Bottlenecks:**
   The settings panel presented an undivided list of plain radio buttons with no structured visual grouping, lacking intuitive stepper controls for font size, and lacking a clear header with close action.
3. **End-of-Chapter Paragraph Focus Bug on Wide/Tall Screens:**
   The paragraph focus aid dimmed non-reading rows (`opacity: 0.38`) based on a static 30% viewport reading line. On tall and wide displays, the final paragraphs at the end of a chapter could never scroll up to 30%, leaving them permanently dimmed.
4. **English Translation Quality Assessment:**
   Need an authoritative scholarly review of the historical English translations used across *Road to Capital* (referencing Meade McCloughan's review in *Marx & Philosophy Review of Books* comparing Reitter 2024, Fowkes 1976, and Moore/Aveling 1887), detailing the strengths, limitations, and rationale for public-domain open sources.

## Implementation

1. **Sticky Reader Bar Integration:**
   - Moved `<ReaderSettings />` out of `.site-header` in `apps/web/src/app/layout.tsx`.
   - Placed `<ReaderSettings />` directly inside the sticky `.reader-bar-main` in `apps/web/src/app/archive/[...path]/page.tsx`, ensuring persistent access anywhere in the chapter, including during Focus Mode.
2. **Settings Panel Redesign:**
   - Redesigned `apps/web/src/components/ReaderSettings.tsx` and `apps/web/src/app/globals.css`:
     - Added a clean panel header with a title and close (`×`) button.
     - Structured preferences into three distinct, uppercase-labeled functional sections:
       - *Typography & Display* (Font family, size, line spacing, measure, indentation, justification).
       - *Reading Aids & Focus* (Reading aids, terminology links, passage numbering).
       - *Pacing & Shortcuts* (Screen wake lock, shortcuts toggle, reading speed).
     - Added quick step buttons (`A−` and `A+`) adjacent to the font size range slider with collision-free aria labels (`Smaller text` / `Larger text`).
     - Upgraded choice radios to responsive segmented pill controls with active accent highlights.
3. **Dynamic Reading Line & Chapter End Scroll Padding:**
   - In `apps/web/src/lib/position.ts`, updated `readingLine()` to dynamically interpolate downward from 30% toward 85% as scroll reaches within `viewportH * 0.6` of the bottom.
   - Updated `rowAtLine()` to select the bottom-most visible row when scrolled within 32px of the document bottom.
   - Added `.rows { padding-bottom: min(35vh, 14rem); }` in `apps/web/src/app/globals.css` to provide generous scroll breathing room for trailing paragraphs.
4. **Scholarly Translation Audit:**
   - Documented historical translators, edition bases, strengths, and limits across all 9 works in *Road to Capital*.
   - Evaluated the public-domain basis (Moore/Aveling, Sweezy, Joynes, Eleanor Marx) and how the Plain Language three-layer architecture resolves Victorian archaic phrasing while preserving conceptual fidelity.

## Verification

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`
- `pnpm test` (all 32 test files, 429 tests passed)
- `pnpm e2e` (Playwright tests passed, including `appearance.spec.ts` and `navigation.spec.ts`)
- `pnpm build:site` (prerendered all 128 static pages cleanly)
- Deployed to Cloudflare Pages: `https://5566a613.plain-language-marxist.pages.dev`
