# Task 026 — Term marks that do not break sentences under browser translation

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 015, 022, 024 |

## Problem
Readers whose first language is not English often turn on the browser's page translation (Chrome / Google Translate, Safari, Edge). On a phone screenshot from the maintainer, translated to Vietnamese, every marked term comes out split from its sentence: "Cái**giai cấp tư bản**đã biến…", "…người man rợ**Và** bán man rợ**các** quốc gia…". The spaces around the term disappear, and the sentence is translated as separate fragments, so the word order and grammar around each term break.

**Cause.** Term marks are `<button>` elements, in the text (`LayoutText`) and inside cards (`TermDetails`). Translators treat form controls as separate units: they translate a button's label apart from the surrounding sentence and trim the spaces next to it. Ordinary inline elements (`<a>`, `<span>`) are translated as part of the sentence.

## Scope
- **Render term marks as links** (`<a class="term" href="/vocabulary/<term>/" data-term=…>`), not buttons. This applies to:
  - Original annotations;
  - Plain English tokens and kept terms;
  - term links inside cards (`.term-link`).

  A link is inline text, so translators keep the sentence whole.
- **`TermCards` intercepts the click** (`preventDefault`) and opens the card as now.
  - Without JavaScript, the link simply goes to the vocabulary page. That is better than today, where a button does nothing without JS.
  - Keyboard: Enter on a link already works. Add `aria-haspopup="dialog"` so screen readers know it opens a card.
- **Keep everything that depends on the marks working:**
  - the "Original terms" switch, which rewrites the text of Plain English marks;
  - `data-kept` and `data-form` / `data-cap` / `data-pin`;
  - the disabled state in the fifth nested card (a link cannot be `disabled`, so render plain text there);
  - focus return;
  - term-underline settings;
  - the dotted-underline style.
- **No layout change.** Marks look exactly as now.

## Acceptance
- With Chrome's "Translate to Vietnamese" on a phone, a paragraph with terms translates as one sentence. Spaces around terms are kept, with no "Cáigiai cấp tư bảnđã" fragments. Checked by hand on the deployed preview, with a before/after screenshot here.
- Automated check (e2e): no term mark in the text is a `<button>`, every paragraph's text keeps a space on each side of each term (`innerText` reads as one sentence), and a term link opens its card with JS and navigates to `/vocabulary/<term>/` without JS.
- Cards, nested cards (task 024), "Original terms", keyboard use and axe all still pass.
