# Task 024 — Clickable terms inside term cards (nested cards, up to 5)

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-04 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 015 |
| **Related** | 022 (richer card text and `related` links), 023 (reader layout) |

## Goal
A term card explains a term with other terms. For example, *capital* mentions *wage labour*; *mode of production* mentions *productive forces*. Make those terms clickable **inside the card**, so a reader can follow the vocabulary without losing their place (maintainer's request, 2026-10-04).

## Behaviour
- **Opening:** clicking a term inside an open card opens that term's card **on top of** the current one, so the cards form a stack. Each card stays slightly offset so the stack is visible.
- **Maximum depth is 5 cards.** In the fifth card, terms are shown as marked but are not clickable. A short hint explains why: "Close a card to open more".
- **Closing:** one **click outside closes one level**: with 2 cards open, a click outside leaves 1. With 5 open, it takes 5 clicks outside to close them all.
  - **Escape** also closes one level, the same as a click outside.
  - Each card's **close button** closes that card and every card above it.
- **A term already open lower in the stack** is not opened again; there are no loops. Clicking it closes the cards above it and returns to that card.
- **Trail:** the top card shows where the reader came from, e.g. *capital › commodity › exchange value*. Each step can be clicked to close back to that card.
- **Focus:**
  - When a card opens, focus moves to it.
  - When a card closes, focus returns to the term link in the card below that opened it.
  - When the last card closes, focus returns to the term in the text.
- **Terminology preference:** the wording choice on each card applies to that card's term, as now.
- **Mobile:** the cards stack as bottom sheets, the newest on top. Tapping outside closes one level, the same rule as on desktop.
- **Without JavaScript,** terms inside card text are plain links to `/vocabulary/<term>/`. The vocabulary pages link terms the same way.

## Scope
- **Marking terms in card text:**
  - At build time, mark vocabulary terms in each card's text (`short`, `long`, and task 022's new fields) using the same whole-word matching as `plm annotate`.
  - A card never marks its own term.
  - Store the marks as an optional field on `DataTerm`. This is an additive change, so data contract v1 stays compatible.
- **`TermCards`:** replace the single open card with a stack, keeping the outside-click and Escape handling. The current component already closes on outside click and Escape and returns focus; extend that logic to one level at a time.
- **Accessibility:**
  - Each card is a labelled dialog, e.g. "Term card 2 of 3: commodity".
  - Only the top card is interactive; the cards below are `inert`.
  - Screen readers announce the change of level.
- **e2e tests:**
  - open 2 cards and click outside → 1 card left;
  - open 5 cards → the fifth card's terms are not clickable;
  - 5 clicks outside close everything;
  - Escape works the same way;
  - the trail returns to the right level;
  - a term already open is not opened twice;
  - focus returns to the right place at each step;
  - mobile;
  - no-JS links;
  - axe with a stack open.

## Acceptance
- Clicking a term inside a card opens a nested card, up to 5 deep, and never more.
- Each click outside, or each Escape, closes exactly one card. Focus always lands on a sensible element.
- Works with keyboard only, on mobile, and (as links) without JavaScript; axe reports no violations.
- `pnpm check` and `pnpm e2e` pass.
